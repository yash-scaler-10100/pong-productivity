from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

VOLUME_MAP = {"stone": 30, "pebble": 15, "sand": 5}
MAX_JAR_VOLUME = 100


def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_or_create_session():
    session_date = today_str()
    session = await db.sessions.find_one({"session_date": session_date}, {"_id": 0})
    if not session:
        session = {
            "id": str(uuid.uuid4()),
            "session_date": session_date,
            "score_you": 0,
            "score_teammate": 0,
            "combo_count": 0,
            "fuel_remaining": MAX_JAR_VOLUME,
            "shipped_items": [],
            "last_ship_time": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.sessions.insert_one(session)
        session.pop("_id", None)
    return session


class TaskCreate(BaseModel):
    title: str
    task_type: str = "pebble"


class ShipRequest(BaseModel):
    description: str = ""


@api_router.get("/")
async def root():
    return {"message": "Zenith API"}


@api_router.get("/tasks")
async def get_tasks():
    tasks = await db.tasks.find(
        {"session_date": today_str()}, {"_id": 0}
    ).to_list(100)
    return tasks


@api_router.post("/tasks")
async def create_task(task: TaskCreate):
    session_date = today_str()
    existing = await db.tasks.find(
        {"session_date": session_date, "shipped": False}, {"_id": 0}
    ).to_list(100)
    current_vol = sum(t.get("volume", 0) for t in existing)
    new_vol = VOLUME_MAP.get(task.task_type, 15)

    if current_vol + new_vol > MAX_JAR_VOLUME:
        raise HTTPException(
            status_code=400,
            detail="Jar is full! Remove or ship existing tasks first."
        )

    doc = {
        "id": str(uuid.uuid4()),
        "title": task.title,
        "task_type": task.task_type,
        "volume": new_vol,
        "shipped": False,
        "shipped_at": None,
        "ship_description": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "session_date": session_date,
    }
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}


@api_router.post("/tasks/{task_id}/ship")
async def ship_task(task_id: str, req: ShipRequest):
    now_iso = datetime.now(timezone.utc).isoformat()
    result = await db.tasks.find_one_and_update(
        {"id": task_id, "shipped": False},
        {"$set": {
            "shipped": True,
            "shipped_at": now_iso,
            "ship_description": req.description
        }},
        projection={"_id": 0},
        return_document=ReturnDocument.AFTER
    )
    if not result:
        raise HTTPException(status_code=404, detail="Task not found or already shipped")

    session_date = today_str()
    await get_or_create_session()
    await db.sessions.update_one(
        {"session_date": session_date},
        {
            "$inc": {"score_you": 1, "fuel_remaining": -result["volume"]},
            "$set": {"last_ship_time": now_iso},
            "$push": {"shipped_items": {
                "task_id": task_id,
                "title": result["title"],
                "task_type": result["task_type"],
                "volume": result["volume"],
                "description": req.description,
                "shipped_at": now_iso,
            }},
        }
    )
    return result


@api_router.get("/session")
async def get_session():
    session = await get_or_create_session()
    return session


@api_router.post("/session/save-day")
async def save_day():
    session_date = today_str()
    session = await db.sessions.find_one({"session_date": session_date}, {"_id": 0})
    tasks = await db.tasks.find({"session_date": session_date}, {"_id": 0}).to_list(100)

    replay = {
        "id": str(uuid.uuid4()),
        "session_date": session_date,
        "session": session,
        "tasks": tasks,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.replays.insert_one(replay)
    replay.pop("_id", None)
    return replay


@api_router.get("/replays")
async def get_replays():
    replays = await db.replays.find(
        {}, {"_id": 0}
    ).sort("saved_at", -1).to_list(50)
    return replays


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
PROJECT_ROOT = ROOT_DIR.parent
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(ROOT_DIR / ".env")

DATA_DIR = Path(os.environ.get("LOCAL_DATA_DIR", PROJECT_ROOT / ".chaospong-data"))
DATA_FILE = DATA_DIR / "fastapi-store.json"

app = FastAPI()
api_router = APIRouter(prefix="/api")

VOLUME_MAP = {"stone": 30, "pebble": 15, "sand": 5}
MAX_JAR_VOLUME = 100
STREAK_THRESHOLD = 3

store_lock = asyncio.Lock()


def empty_store() -> dict[str, Any]:
    return {
        "tasks": [],
        "sessions": {},
        "replays": [],
        "stats": {"streak_record": {"type": "streak_record", "best_streak": 0}},
    }


async def read_store() -> dict[str, Any]:
    async with store_lock:
        if not DATA_FILE.exists():
            return empty_store()
        try:
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return empty_store()


async def write_store(store: dict[str, Any]) -> None:
    async with store_lock:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        DATA_FILE.write_text(json.dumps(store, indent=2), encoding="utf-8")


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_task(task: dict[str, Any]) -> dict[str, Any]:
    return dict(task)


async def get_or_create_session(store: dict[str, Any] | None = None) -> dict[str, Any]:
    owns_store = store is None
    data = store if store is not None else await read_store()
    session_date = today_str()
    sessions = data.setdefault("sessions", {})

    if session_date not in sessions:
        sessions[session_date] = {
            "id": str(uuid.uuid4()),
            "session_date": session_date,
            "score_you": 0,
            "score_teammate": 0,
            "combo_count": 0,
            "fuel_remaining": MAX_JAR_VOLUME,
            "shipped_items": [],
            "last_ship_time": None,
            "created_at": now_iso(),
        }
        if owns_store:
            await write_store(data)

    return dict(sessions[session_date])


class TaskCreate(BaseModel):
    title: str
    task_type: Literal["stone", "pebble", "sand"] = "pebble"


class ShipRequest(BaseModel):
    description: str = ""


@api_router.get("/")
async def root():
    return {"message": "ChaosPong API", "storage": "local-files"}


@api_router.get("/tasks")
async def get_tasks():
    store = await read_store()
    session_date = today_str()
    return [
        clean_task(task)
        for task in store.get("tasks", [])
        if task.get("session_date") == session_date
    ]


@api_router.post("/tasks")
async def create_task(task: TaskCreate):
    store = await read_store()
    session_date = today_str()
    tasks = store.setdefault("tasks", [])
    existing = [
        item
        for item in tasks
        if item.get("session_date") == session_date and item.get("shipped") is False
    ]
    current_vol = sum(item.get("volume", 0) for item in existing)
    new_vol = VOLUME_MAP.get(task.task_type, 15)

    if current_vol + new_vol > MAX_JAR_VOLUME:
        raise HTTPException(
            status_code=400,
            detail="Jar is full! Remove or ship existing tasks first.",
        )

    doc = {
        "id": str(uuid.uuid4()),
        "title": task.title,
        "task_type": task.task_type,
        "volume": new_vol,
        "shipped": False,
        "shipped_at": None,
        "ship_description": None,
        "created_at": now_iso(),
        "session_date": session_date,
    }
    tasks.append(doc)
    await write_store(store)
    return clean_task(doc)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    store = await read_store()
    tasks = store.setdefault("tasks", [])
    next_tasks = [task for task in tasks if task.get("id") != task_id]
    if len(next_tasks) == len(tasks):
        raise HTTPException(status_code=404, detail="Task not found")

    store["tasks"] = next_tasks
    await write_store(store)
    return {"status": "deleted"}


@api_router.post("/tasks/{task_id}/ship")
async def ship_task(task_id: str, req: ShipRequest):
    store = await read_store()
    tasks = store.setdefault("tasks", [])
    task = next(
        (item for item in tasks if item.get("id") == task_id and item.get("shipped") is False),
        None,
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or already shipped")

    shipped_at = now_iso()
    task["shipped"] = True
    task["shipped_at"] = shipped_at
    task["ship_description"] = req.description

    session_date = today_str()
    sessions = store.setdefault("sessions", {})
    if session_date not in sessions:
        await get_or_create_session(store)

    session = sessions[session_date]
    session["score_you"] = session.get("score_you", 0) + 1
    session["fuel_remaining"] = session.get("fuel_remaining", MAX_JAR_VOLUME) - task["volume"]
    session["last_ship_time"] = shipped_at
    session.setdefault("shipped_items", []).append(
        {
            "task_id": task_id,
            "title": task["title"],
            "task_type": task["task_type"],
            "volume": task["volume"],
            "description": req.description,
            "shipped_at": shipped_at,
        }
    )

    await write_store(store)
    return clean_task(task)


@api_router.get("/session")
async def get_session():
    store = await read_store()
    session = await get_or_create_session(store)
    await write_store(store)
    return session


@api_router.post("/session/save-day")
async def save_day():
    store = await read_store()
    session_date = today_str()
    session = store.setdefault("sessions", {}).get(session_date)
    tasks = [
        clean_task(task)
        for task in store.get("tasks", [])
        if task.get("session_date") == session_date
    ]

    replay = {
        "id": str(uuid.uuid4()),
        "session_date": session_date,
        "session": session,
        "tasks": tasks,
        "saved_at": now_iso(),
    }
    store.setdefault("replays", []).append(replay)
    await write_store(store)
    return replay


@api_router.get("/replays")
async def get_replays():
    store = await read_store()
    return sorted(
        store.get("replays", []),
        key=lambda replay: replay.get("saved_at", ""),
        reverse=True,
    )[:50]


async def calculate_streak(store: dict[str, Any]) -> tuple[int, datetime.date]:
    today = datetime.now(timezone.utc).date()
    streak = 0
    current_date = today
    sessions = store.setdefault("sessions", {})

    while True:
        date_str = current_date.strftime("%Y-%m-%d")
        session = sessions.get(date_str)
        if session and session.get("score_you", 0) >= STREAK_THRESHOLD:
            streak += 1
            current_date -= timedelta(days=1)
        else:
            break

    stats = store.setdefault("stats", {}).setdefault(
        "streak_record",
        {"type": "streak_record", "best_streak": 0},
    )
    stats["best_streak"] = max(stats.get("best_streak", 0), streak)

    return streak, current_date + timedelta(days=1)


@api_router.get("/streak")
async def get_streak():
    store = await read_store()
    today = datetime.now(timezone.utc).date()
    sessions = store.setdefault("sessions", {})
    today_session = sessions.get(today.strftime("%Y-%m-%d"))
    today_ships = today_session.get("score_you", 0) if today_session else 0
    today_qualifies = today_ships >= STREAK_THRESHOLD

    current_streak, _ = await calculate_streak(store)

    yesterday = today - timedelta(days=1)
    prev_streak = 0
    check = yesterday
    while True:
        session = sessions.get(check.strftime("%Y-%m-%d"))
        if session and session.get("score_you", 0) >= STREAK_THRESHOLD:
            prev_streak += 1
            check -= timedelta(days=1)
        else:
            break

    record = store.setdefault("stats", {}).setdefault(
        "streak_record",
        {"type": "streak_record", "best_streak": 0},
    )
    best = record.get("best_streak", 0)
    await write_store(store)

    return {
        "current": current_streak,
        "today_ships": today_ships,
        "today_qualifies": today_qualifies,
        "ships_needed": max(0, STREAK_THRESHOLD - today_ships),
        "streak_at_risk": prev_streak if not today_qualifies and prev_streak > 0 else 0,
        "best_ever": max(best, current_streak),
        "threshold": STREAK_THRESHOLD,
    }


app.include_router(api_router)

cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=cors_origins != ["*"],
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

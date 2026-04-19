import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { MatchData } from "@/lib/types";

type MatchStoreGlobal = typeof globalThis & {
  __chaosPongMatches?: Map<string, MatchData>;
};

const STORE_DIR = join(tmpdir(), "chaospong");
const STORE_FILE = join(STORE_DIR, "matches.json");

function memoryStore() {
  const globalStore = globalThis as MatchStoreGlobal;
  if (!globalStore.__chaosPongMatches) {
    globalStore.__chaosPongMatches = new Map<string, MatchData>();
  }
  return globalStore.__chaosPongMatches;
}

async function readDiskStore(): Promise<Record<string, MatchData>> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    return JSON.parse(raw) as Record<string, MatchData>;
  } catch {
    return {};
  }
}

async function writeDiskStore(matches: Record<string, MatchData>) {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(matches, null, 2), "utf8");
}

export async function saveMatch(match: MatchData): Promise<MatchData> {
  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const saved: MatchData = {
    ...match,
    id,
    updatedAt: now,
    createdAt: match.createdAt || now,
  };

  memoryStore().set(id, saved);
  const disk = await readDiskStore();
  disk[id] = saved;
  await writeDiskStore(disk);

  return saved;
}

export async function getMatch(id: string): Promise<MatchData | null> {
  const memory = memoryStore().get(id);
  if (memory) {
    return memory;
  }

  const disk = await readDiskStore();
  const found = disk[id] ?? null;
  if (found) {
    memoryStore().set(id, found);
  }
  return found;
}

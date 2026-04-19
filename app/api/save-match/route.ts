import { NextResponse, type NextRequest } from "next/server";
import { saveMatch } from "@/lib/match-store";
import type { MatchData } from "@/lib/types";

export const runtime = "nodejs";

function isMatchData(value: unknown): value is MatchData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MatchData>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.combos === "number" &&
    Array.isArray(candidate.ships) &&
    Boolean(candidate.score)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    if (!isMatchData(body)) {
      return NextResponse.json({ error: "Invalid match payload" }, { status: 400 });
    }

    const saved = await saveMatch(body);
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const host = request.headers.get("host") ?? "localhost:3000";
    const shareUrl = `${proto}://${host}/match/${saved.id}`;

    return NextResponse.json({ id: saved.id, shareUrl, match: saved });
  } catch {
    return NextResponse.json({ error: "Unable to save match" }, { status: 500 });
  }
}

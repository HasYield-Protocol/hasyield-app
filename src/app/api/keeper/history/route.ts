import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function readLastLines(filePath: string, n: number): string[] {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return data.trim().split("\n").filter(Boolean).slice(-n);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);

  const remote = process.env.KEEPER_HISTORY_REMOTE;
  if (remote) {
    try {
      const res = await fetch(`${remote}?limit=${limit}`, { cache: "no-store" });
      if (res.ok) return NextResponse.json(await res.json());
    } catch {
      // fall through to local
    }
  }

  const logPath = path.resolve(
    process.cwd(),
    "..",
    "hasyield-programs",
    "run-log.jsonl",
  );
  const lines = readLastLines(logPath, limit * 4); // over-read to filter
  const runs = lines
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .reverse(); // newest first

  return NextResponse.json({ runs: runs.slice(0, limit) });
}

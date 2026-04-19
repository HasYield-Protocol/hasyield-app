import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DEFAULT_INTERVAL_SEC = 6 * 60 * 60;

function readLastLogLine(filePath: string): string | null {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const lines = data.trim().split("\n").filter(Boolean);
    return lines.length > 0 ? lines[lines.length - 1] : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const intervalSec = Number(process.env.KEEPER_INTERVAL_SEC ?? DEFAULT_INTERVAL_SEC);

  // Prefer remote endpoint if configured (production: keeper on VPS exposes this)
  const remote = process.env.KEEPER_STATUS_REMOTE;
  if (remote) {
    try {
      const res = await fetch(remote, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // fall through to local
    }
  }

  // Local: read run-log.jsonl from the programs repo (dev)
  const logPath = path.resolve(
    process.cwd(),
    "..",
    "hasyield-programs",
    "run-log.jsonl",
  );
  const lastLine = readLastLogLine(logPath);
  const last = lastLine ? JSON.parse(lastLine) : null;

  return NextResponse.json({
    last,
    intervalSec,
    source: remote ? "remote-fallback-local" : "local",
  });
}

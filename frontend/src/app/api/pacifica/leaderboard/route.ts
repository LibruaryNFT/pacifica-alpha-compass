import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8002";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/pacifica/leaderboard`, {
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      return NextResponse.json({ error: `Backend ${response.status}` }, { status: response.status });
    }
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: "Pacifica intel unreachable" }, { status: 502 });
  }
}

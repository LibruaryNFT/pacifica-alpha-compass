import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8002";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/orders/intents`, {
      headers: { "x-internal-key": INTERNAL_API_KEY },
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend ${response.status}` },
        { status: response.status }
      );
    }
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { error: "Orders backend unreachable" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/orders/intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend ${response.status}` },
        { status: response.status }
      );
    }
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { error: "Orders backend unreachable" },
      { status: 502 }
    );
  }
}

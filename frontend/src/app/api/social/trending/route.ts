import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://89.167.70.176:8002";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/social/trending`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Social trending backend unreachable", detail: String(error) },
      { status: 502 }
    );
  }
}

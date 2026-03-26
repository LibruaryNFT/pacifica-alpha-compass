import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8002";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/accuracy/live`, {
      headers: { "x-internal-key": INTERNAL_API_KEY },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Accuracy backend unreachable", detail: String(error) },
      { status: 502 }
    );
  }
}

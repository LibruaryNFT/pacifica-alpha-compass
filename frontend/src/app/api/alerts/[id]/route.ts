import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8002";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: alertId } = await params;
    const response = await fetch(`${BACKEND_URL}/api/alerts/${alertId}`, {
      method: "DELETE",
      headers: { "x-internal-key": INTERNAL_API_KEY },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend ${response.status}` },
        { status: response.status }
      );
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Alerts backend unreachable" },
      { status: 502 }
    );
  }
}

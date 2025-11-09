import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Call backend to get Gmail auth URL
    const backendRes = await fetch('http://localhost:3001/api/gmail/auth', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await backendRes.json();

    if (!data.authUrl) {
      return NextResponse.json({ error: "Failed to get auth URL from backend" }, { status: 500 });
    }

    // Return the auth URL to the frontend
    return NextResponse.json({ authUrl: data.authUrl });
  } catch (error) {
    console.error("Gmail auth error:", error);
    return NextResponse.json({ error: "Failed to fetch auth URL" }, { status: 500 });
  }
}

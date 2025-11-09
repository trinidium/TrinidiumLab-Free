import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Check if credentials are configured
    const hasCredentials = !!process.env.GMAIL_CREDENTIALS

    return NextResponse.json({
      configured: hasCredentials,
      status: hasCredentials ? "Credentials configured" : "No credentials found",
    })
  } catch (error) {
    console.error("Gmail credentials check error:", error)
    return NextResponse.json({ error: "Failed to check credentials" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const credentials = await request.json()

    // In a real app, store credentials securely in database
    // For now, we'll validate the structure
    if (!credentials.web || !credentials.web.client_id) {
      return NextResponse.json({ error: "Invalid credentials format" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Credentials uploaded successfully" })
  } catch (error) {
    console.error("Gmail credentials upload error:", error)
    return NextResponse.json({ error: "Failed to upload credentials" }, { status: 500 })
  }
}

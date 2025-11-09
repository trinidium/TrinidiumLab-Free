import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, accessToken } = await request.json()

    if (!to || !subject || !body || !accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create email message
    const message = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/html; charset=utf-8", "", body].join("\n")

    const encodedMessage = Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_")

    // Send email via Gmail API
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 400 })
    }

    return NextResponse.json({ success: true, messageId: result.id })
  } catch (error) {
    console.error("Gmail send error:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

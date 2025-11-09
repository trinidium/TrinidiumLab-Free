import { type NextRequest, NextResponse } from "next/server"

// Mock database - replace with your SQLite connection
const campaigns: Array<{
  id: string
  name: string
  status: "Draft" | "Running" | "Paused" | "Completed" | "Stopped"
  totalLeads: number
  sentCount: number
  failedCount: number
  createdAt: string
}> = []

export async function GET() {
  try {
    // TODO: Replace with actual SQLite query
    // const campaigns = await db.query('SELECT * FROM campaigns ORDER BY createdAt DESC')

    return NextResponse.json({
      success: true,
      data: campaigns,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch campaigns" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, leadIds, template } = body

    if (!name || !leadIds || !template) {
      return NextResponse.json({ success: false, error: "Name, leadIds, and template are required" }, { status: 400 })
    }

    const newCampaign = {
      id: Date.now().toString(),
      name,
      status: "Draft" as const,
      totalLeads: leadIds.length,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
    }

    // TODO: Replace with actual SQLite insert
    // await db.query('INSERT INTO campaigns (name, status, totalLeads) VALUES (?, ?, ?)', [name, 'Draft', leadIds.length])
    campaigns.push(newCampaign)

    return NextResponse.json({
      success: true,
      data: newCampaign,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create campaign" }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Quick health check - try to count users
    const userCount = await db.user.count()
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      users: userCount,
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
    }, { status: 500 })
  }
}

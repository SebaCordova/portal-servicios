import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({
    SITE_URL: process.env.SITE_URL,
    NODE_ENV: process.env.NODE_ENV
  })
}

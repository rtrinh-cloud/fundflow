import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendConnectionRequest } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('connections').insert({
    id: `conn-${Date.now()}`, ...body
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sendConnectionRequest({
    founderEmail: body.founder_email,
    founderName: body.founder_name,
    companyName: body.company,
    investorName: body.investor_name,
    investorFirm: body.investor_firm,
    investorEmail: body.investor_email,
    message: body.message,
    schedulingLink: body.scheduling_link,
  })

  return NextResponse.json(data)
}

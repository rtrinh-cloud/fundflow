
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const action = body.action
  const email = body.email
  const password = body.password

  if (action === 'signup') {
    const check = await supabaseAdmin.from('founders').select('id').eq('email', email).single()
    if (check.data) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    const hash = await bcrypt.hash(password, 10)
    const row = {
      id: 'co-' + Date.now(),
      founder_name: body.name,
      company: body.company,
      email: email,
      password_hash: hash,
      logo_url: body.logoDataUrl || null,
      vertical: body.vertical || null,
      stage: body.stage || null,
      round_amount: body.roundAmount || null,
      description: body.description || null,
      fundraising: body.fundraising || true,
      scheduling_link: body.schedulingLink || null
    }
    const result = await supabaseAdmin.from('founders').insert(row).select().single()
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
    return NextResponse.json(result.data)
  }

  if (action === 'login') {
    const result = await supabaseAdmin.from('founders').select('*').eq('email', email).single()
    if (result.error || !result.data) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }
    const valid = await bcrypt.compare(password, result.data.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }
    return NextResponse.json(result.data)
  }

  if (action === 'recover') {
    const result = await supabaseAdmin.from('founders').select('email').eq('email', email).single()
    if (!result.data) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

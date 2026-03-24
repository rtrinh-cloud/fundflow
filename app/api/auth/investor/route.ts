import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const action = body.action
  const email = body.email
  const password = body.password

  if (action === 'signup') {
    const check = await supabaseAdmin.from('investors').select('id').eq('email', email).single()
    if (check.data) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    const hash = await bcrypt.hash(password, 10)
    const row = {
      id: 'inv-' + Date.now(),
      name: body.name,
      firm: body.firm || null,
      email: email,
      password_hash: hash,
      scheduling_link: body.schedulingLink || null,
      focus_verticals: body.focusVerticals ? body.focusVerticals.join(',') : null,
      focus_stages: body.focusStages ? body.focusStages.join(',') : null
    }
    const result = await supabaseAdmin.from('investors').insert(row).select().single()
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
    return NextResponse.json(result.data)
  }

  if (action === 'login') {
    const result = await supabaseAdmin.from('investors').select('*').eq('email', email).single()
    if (result.error || !result.data) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }
    const valid = await bcrypt.compare(password, result.data.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }
    return NextResponse.json(result.data)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { action, name, company, email, password, ...rest } = await req.json()

  if (action === 'signup') {
    const { data: existing } = await supabaseAdmin
      .from('founders').select('id').eq('email', email).single()
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabaseAdmin.from('founders').insert({
      id: `co-${Date.now()}`, founder_name: name, company, email, password_hash, ...rest
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { password_hash: _, ...safe } = data
    return NextResponse.json(safe)
  }

  if (action === 'login') {
    const { data, error } = await supabaseAdmin
      .from('founders').select('*').eq('email', email).single()
    if (error || !data) return NextResponse.json({ error: 'No account found' }, { status: 404 })
    const valid = await bcrypt.compare(password, data.password_hash)
    if (!valid) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    const { password_hash: _, ...safe } = data
    return NextResponse.json(safe)
  }

  if (action === 'recover') {
    const { data } = await supabaseAdmin
      .from('founders').select('email').eq('email', email).single()
    if (!data) return NextResponse.json({ error: 'No account found' }, { status: 404 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

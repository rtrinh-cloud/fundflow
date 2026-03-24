import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, name, firm, email, password } = body

  if (action === 'signup') {
    const { data: existing } = await supabaseAdmin
      .from('investors').select('id').eq('email', email).single()
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabaseAdmin.from('investors').insert({
      id: 'inv-' + Date.now(),
      name: name,
      firm: firm,
      email: email,
      password_hash: password_hash,
      scheduling_link: body.schedulingLink || null,
      focus_verticals: body.focusVerticals ? body.focusVerticals.join(',') : null,
      focus_stages:

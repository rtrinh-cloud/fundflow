import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { action, name, firm, email, password, ...rest } = await req.json()

  if (action === 'signup') {
    const { data: existing } = await supabaseAdmin
      .from('investors').select('id').eq('email', email).single()
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabaseAdmin.from('investors').insert({
      id: `inv-${Date.now()}`, name, firm, email, password_hash

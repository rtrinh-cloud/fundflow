## 9. app/api/companies/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('founders')
    .select('id,founder_name,company,logo_url,vertical,stage,round_amount,description,fundraising,scheduling_link,created_at')
    .eq('fundraising', true)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

---

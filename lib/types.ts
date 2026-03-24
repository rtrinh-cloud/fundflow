## 5. lib/types.ts
```typescript
export type Founder = {
  id: string
  founder_name: string
  company: string
  logo_url?: string
  vertical: string
  stage: string
  round_amount?: string
  description?: string
  fundraising: boolean
  email: string
  scheduling_link?: string
  created_at: string
}

export type Investor = {
  id: string
  name: string
  firm?: string
  email: string
  scheduling_link?: string
  focus_verticals?: string
  focus_stages?: string
  created_at: string
}

export type Connection = {
  id: string
  investor_name: string
  investor_firm?: string
  investor_email: string
  founder_name: string
  company: string
  founder_email: string
  message?: string
  created_at: string
}
```

---

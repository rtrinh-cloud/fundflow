## 4. lib/resend.ts
```typescript
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendConnectionRequest({
  founderEmail,
  founderName,
  companyName,
  investorName,
  investorFirm,
  investorEmail,
  message,
  schedulingLink,
}: {
  founderEmail: string
  founderName: string
  companyName: string
  investorName: string
  investorFirm: string
  investorEmail: string
  message?: string
  schedulingLink?: string
}) {
  await resend.emails.send({
    from: 'FundFlow ',
    to: founderEmail,
    subject: `${investorFirm || investorName} wants to connect with ${companyName}`,
    html: `
      
        You have a new investor connection request 🎉
        ${investorName} from ${investorFirm || 'an investment firm'} is interested in connecting with ${companyName}.
        ${message ? `Their message: ${message}` : ''}
        Investor email: ${investorEmail}
        ${schedulingLink ? `Schedule a Call` : ''}
        
        Sent via FundFlow · Powered by Mercury
      
    `,
  })
}
```

---

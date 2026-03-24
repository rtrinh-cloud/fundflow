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
    from: 'FundFlow <noreply@yourdomain.com>',
    to: founderEmail,
    subject: `${investorFirm || investorName} wants to connect with ${companyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>You have a new investor connection request 🎉</h2>
        <p><strong>${investorName}</strong> from <strong>${investorFirm || 'an investment firm'}</strong> is interested in connecting with <strong>${companyName}</strong>.</p>
        ${message ? `<p><strong>Their message:</strong> ${message}</p>` : ''}
        <p><strong>Investor email:</strong> <a href="mailto:${investorEmail}">${investorEmail}</a></p>
        ${schedulingLink ? `<p><a href="${schedulingLink}" style="background:#00f5a0;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Schedule a Call</a></p>` : ''}
        <hr/>
        <p style="color:#888;font-size:12px;">Sent via FundFlow · Powered by Mercury</p>
      </div>
    `,
  })
}

import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendConnectionRequest(params: {
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
    to: params.founderEmail,
    subject: params.investorFirm + ' wants to connect with ' + params.companyName,
    html: '<div style="font-family:sans-serif"><h2>New investor connection request</h2><p><strong>' + params.investorName + '</strong> from <strong>' + (params.investorFirm || 'an investment firm') + '</strong> wants to connect with <strong>' + params.companyName + '</strong></p>' + (params.message ? '<p>Message: ' + params.message + '</p>' : '') + '<p>Investor email: ' + params.investorEmail + '</p>' + (params.schedulingLink ? '<p><a href="' + params.schedulingLink + '" style="background:#00f5a0;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Schedule a Call</a></p>' : '') + '</div>'
  })
}

import { Resend } from 'resend'

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
}

export async function sendInvitationEmail(args: {
  to: string
  role: string
  labelName: string
  token: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      sent: false,
      reason: 'RESEND_API_KEY missing',
      inviteUrl: `${getBaseUrl()}/invite/${args.token}`,
    }
  }

  const resend = new Resend(apiKey)
  const inviteUrl = `${getBaseUrl()}/invite/${args.token}`
  const from = process.env.RESEND_FROM || 'SoundLedger <onboarding@resend.dev>'

  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: `Invitație SoundLedger — ${args.labelName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 20px; background: #f8f9fa;">
        <div style="background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 8px; font-size: 22px; color: #111;"> SoundLedger</h2>
          <p style="color: #666; margin: 0 0 24px;">Platforma de management pentru label-uri muzicale</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 0 0 24px;" />

          <h3 style="margin: 0 0 12px; font-size: 18px;">Ai primit o invitație!</h3>
          <p style="color: #444; line-height: 1.6; margin: 0 0 8px;">
            Ai fost invitat să faci parte din echipa label-ului <strong>${args.labelName}</strong>
            cu rolul de <strong>${args.role}</strong>.
          </p>
          <p style="color: #666; font-size: 14px; margin: 0 0 24px;">Invitația este valabilă 7 zile.</p>

          <a href="${inviteUrl}"
             style="display: inline-block; padding: 12px 28px; background: #6c47ff; color: #fff;
                    text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Activează contul
          </a>

          <p style="color: #aaa; font-size: 12px; margin: 24px 0 0;">
            Sau copiază linkul: ${inviteUrl}
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    console.error('[mail] Resend error:', error)
    return { sent: false, reason: error.message, inviteUrl }
  }

  return { sent: true, inviteUrl }
}

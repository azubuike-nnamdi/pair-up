import { appUrl } from "@/lib/domain"
import { sendMail } from "@/lib/mail/mailtrap"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f6f5f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;">
          <tr>
            <td style="padding:24px 32px;background:#1c1917;color:#fafaf9;font-family:Georgia,serif;">
              <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">Pair Up</p>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:600;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;color:#1c1917;font-size:15px;line-height:24px;">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendWelcomeEmail(input: { to: string; firstName: string }) {
  const loginUrl = `${appUrl()}/login`
  const url = escapeHtml(loginUrl)
  const text = `Hello ${input.firstName},

You have been registered for Pair Up, the graduate trainee accommodation allocation.

When you are ready, sign in with this email address:
${loginUrl}

A sign-in link is sent only when you request one from that page.`
  const html = layout(
    "Welcome to Pair Up",
    `<p>Hello ${escapeHtml(input.firstName)},</p>
     <p>You have been registered for graduate trainee accommodation allocation.</p>
     <p>When you are ready, sign in with this email address. A sign-in link is sent only when you request one.</p>
     <p><a href="${url}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:12px 18px;font-weight:700;">Go to sign in</a></p>
     <p style="color:#57534e;font-size:13px;">${url}</p>`
  )
  await sendMail({
    to: input.to,
    subject: "Welcome to Pair Up",
    text,
    html,
  })
}

export async function sendMagicLinkEmail(input: {
  to: string
  firstName: string
  url: string
}) {
  const url = escapeHtml(input.url)
  const text = `Hello ${input.firstName},

Sign in to Pair Up with this secure link:
${input.url}

This link expires in 30 minutes and can only be used once.`
  const html = layout(
    "Your sign-in link",
    `<p>Hello ${escapeHtml(input.firstName)},</p>
     <p>Use the secure link below to continue your accommodation selection.</p>
     <p><a href="${url}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:12px 18px;font-weight:700;">Continue</a></p>
     <p style="color:#57534e;font-size:13px;">This link expires in 30 minutes and can only be used once.<br />${url}</p>`
  )
  await sendMail({
    to: input.to,
    subject: "Your Pair Up sign-in link",
    text,
    html,
  })
}

export async function sendInvitationEmail(input: {
  to: string
  inviteeName: string
  requesterName: string
  pocketName: string
  typeLabel: string
  url: string
}) {
  const url = escapeHtml(input.url)
  const text = `Hello ${input.inviteeName},

${input.requesterName} selected you for ${input.pocketName} (${input.typeLabel}).

Approve or decline:
${input.url}`
  const html = layout(
    "Approval request",
    `<p>Hello ${escapeHtml(input.inviteeName)},</p>
     <p><strong>${escapeHtml(input.requesterName)}</strong> selected you for <strong>${escapeHtml(input.pocketName)}</strong> (${escapeHtml(input.typeLabel)}).</p>
     <p>The pocket is confirmed only after every selected person approves.</p>
     <p><a href="${url}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:12px 18px;font-weight:700;">Review invitation</a></p>
     <p style="color:#57534e;font-size:13px;">${url}</p>`
  )
  await sendMail({
    to: input.to,
    subject: `Approval request for ${input.pocketName}`,
    text,
    html,
  })
}

const MAILTRAP_SEND_URL = "https://send.api.mailtrap.io/api/send"

export async function sendMail(options: {
  to: string
  subject: string
  text: string
  html: string
}) {
  const sender = process.env.MAILTRAP_FROM_EMAIL
  const token = process.env.MAILTRAP_API_TOKEN
  if (!sender || !token) {
    throw new Error("Email is not configured.")
  }

  const response = await fetch(MAILTRAP_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "pair-up",
    },
    body: JSON.stringify({
      from: {
        email: sender,
        name: process.env.MAILTRAP_SENDER_NAME ?? "Pair Up",
      },
      to: [{ email: options.to }],
      subject: options.subject,
      text: options.text,
      html: options.html,
      category: "accommodation",
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean
    errors?: string[]
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.join(" ") || "Email could not be sent.")
  }
}

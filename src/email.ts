import { Resend } from 'resend'

const debug = require('debug')('app:services:email')

const { EMAIL_API_KEY, SEND_EMAILS, SMTP_FROM } = process.env

interface SendEmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  if (!SEND_EMAILS) {
    debug('SEND_EMAILS not set, return')
    return
  }

  const resend = new Resend(EMAIL_API_KEY)

  try {
    // @ts-expect-error it's fine
    const result = await resend.emails.send({
      from: SMTP_FROM as string,
      to,
      subject,
      text,
      html
    })

    debug('[send] result=%j', result)

    return result
  } catch (err) {
    debug('[send] %s', err)
    throw err
  }
}

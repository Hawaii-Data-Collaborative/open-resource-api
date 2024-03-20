import nodemailer from 'nodemailer'

const debug = require('debug')('app:services:email')

const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SEND_EMAILS } = process.env

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
})

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

  const result = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html
  })

  debug('[send]: result=%j', result)
  return result
}

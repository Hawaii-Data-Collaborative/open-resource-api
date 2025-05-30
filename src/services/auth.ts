import bcrypt from 'bcrypt'
import prisma from '../lib/prisma'
import { BadRequestError } from '../errors'
import { getRandomString } from '../util'
import { user as User } from '@prisma/client'
import { sendEmail } from '../email'
import axios from 'axios'
import { Service } from './base'

const debug = require('debug')('app:services:auth')

const { CLOUDFLARE_PRIVATE_KEY } = process.env
if (!CLOUDFLARE_PRIVATE_KEY) {
  throw new Error('CLOUDFLARE_PRIVATE_KEY is missing')
}

export class AuthService extends Service {
  hashPassword(rawpassword: string) {
    return bcrypt.hashSync(rawpassword, 10)
  }

  async startSession(user: User, data?: any) {
    const session = await prisma.session.create({
      data: {
        id: getRandomString(),
        userId: user.id,
        data: data ? JSON.stringify(data) : undefined,
        createdAt: new Date().toJSON(),
        updatedAt: new Date().toJSON()
      }
    })

    debug('[startSession] created session %s', session.id)

    return session
  }

  async signup(email: string, rawpassword: string) {
    email = email.trim()
    rawpassword = rawpassword.trim()
    const existing = await prisma.user.findFirst({ where: { email } })
    if (existing) {
      throw new BadRequestError('Email in use')
    }
    const password = this.hashPassword(rawpassword)

    const user = await prisma.user.create({
      data: {
        email,
        password,
        type: 'USER',
        createdAt: new Date().toJSON(),
        updatedAt: new Date().toJSON()
      }
    })

    debug('[signup] created user %s', user.id)

    const session = await this.startSession(user)

    return { user, session }
  }

  async login(email: string, rawpassword: string) {
    debug('[login] attempt')
    const user = await prisma.user.findFirst({ where: { email } })
    if (!user) {
      debug('[login] fail')
      throw new BadRequestError('Invalid credentials')
    }
    const correct = bcrypt.compareSync(rawpassword, user.password)
    if (!correct) {
      debug('[login] fail, userId=%s', user.id)
      throw new BadRequestError('Invalid credentials')
    }
    const session = await this.startSession(user)
    debug('[login] success, userId=%s', user.id)
    return { user, session }
  }

  async sendPasswordResetCode(email: string) {
    debug('[sendPasswordResetCode] attempt')
    const user = await prisma.user.findFirst({ where: { email } })
    if (!user) {
      debug('[sendPasswordResetCode] fail')
      throw new BadRequestError('Account not found')
    }
    const code = getRandomString(6, 'NUMERIC')
    await sendEmail({
      to: user.email,
      subject: 'Password reset',
      html: `<p>Use the following code to reset your password:</p><p>${code}</p>`
    })
    const session = await this.startSession(user, { code })
    debug('[sendPasswordResetCode] success, userId=%s', user.id)
    return { user, session }
  }

  async checkPasswordResetCode(code: string, token: string) {
    debug('[checkPasswordResetCode] attempt')
    const session = await prisma.session.findUnique({ where: { id: token } })
    if (!session?.data) {
      debug('[checkPasswordResetCode] fail')
      throw new BadRequestError('Invalid code')
    }
    const data = JSON.parse(session.data)
    if (data?.code !== code) {
      debug('[checkPasswordResetCode] fail')
      throw new BadRequestError('Invalid code')
    }
    debug('[checkPasswordResetCode] success')
  }

  async resetPassword(rawpassword: string, token: string) {
    debug('[resetPassword] attempt')
    let session = await prisma.session.findUnique({ where: { id: token } })
    if (!session) {
      debug('[resetPassword] fail')
      throw new BadRequestError('Invalid token')
    }
    let user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) {
      debug('[resetPassword] fail')
      throw new BadRequestError('Account not found')
    }
    const password = this.hashPassword(rawpassword)
    user = await prisma.user.update({
      data: { password, updatedAt: new Date().toJSON() },
      where: { id: user.id }
    })

    await prisma.session.delete({ where: { id: session.id } })
    session = await this.startSession(user)
    debug('[resetPassword] success, userId=%s', user.id)
    return { user, session }
  }

  async deleteAccount(user) {
    debug('[deleteAccount] user.id=%s', user.id)
    if (user.type === 'ADMIN') {
      debug('[deleteAccount] user id admin, deny')
      throw new BadRequestError('Admin accounts must be deleted manually')
    }
    const res1 = await prisma.session.deleteMany({ where: { userId: user.id } })
    debug('[deleteAccount] deleted %s sessions', res1.count)
    await prisma.user.delete({ where: { id: user.id } })
    debug('[deleteAccount] deleted user %s', user.id)
    return { message: 'Your account was successfully deleted.' }
  }

  async verifyToken(token: string, ip?: string) {
    debug('[verifyToken] token=%s... ip=%s', token.substring(0, 50), ip)
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    const data = {
      secret: CLOUDFLARE_PRIVATE_KEY,
      response: token,
      remoteip: ip
    }
    const res = await axios.post(url, data)
    debug('[verifyToken] res.status=%s res.data=%j', res.status, res.data)
  }
}

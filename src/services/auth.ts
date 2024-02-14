import bcrypt from 'bcrypt'
import prisma from '../lib/prisma'
import { BadRequestError } from '../errors'
import { Context } from 'koa'
import { getRandomString } from '../util'
import { user as User } from '@prisma/client'
import { COOKIE_NAME } from '../constants'

const debug = require('debug')('app:services:auth')

const ONE_YEAR = 1000 * 60 * 60 * 24 * 365

export const hashPassword = (rawpassword: string) => bcrypt.hashSync(rawpassword, 10)

export async function startSession(user: User, ctx: Context) {
  const session = await prisma.session.create({
    data: {
      id: getRandomString(),
      userId: user.id,
      createdAt: new Date().toJSON(),
      updatedAt: new Date().toJSON()
    }
  })

  debug('[signup] created session %s', session.id)
  ctx.cookies.set(COOKIE_NAME, session.id, {
    expires: new Date(Date.now() + ONE_YEAR),
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  })
  return session
}

export function endSession(ctx: Context) {
  ctx.cookies.set(COOKIE_NAME)
}

export async function signup(email: string, rawpassword: string, ctx: Context) {
  email = email.trim()
  rawpassword = rawpassword.trim()
  const existing = await prisma.user.findFirst({ where: { email } })
  if (existing) {
    throw new Error('Email in use')
  }
  const password = hashPassword(rawpassword)

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

  const session = await startSession(user, ctx)

  return { user, session }
}

export async function login(email: string, rawpassword: string, ctx: Context) {
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
  const session = await startSession(user, ctx)
  debug('[login] success, userId=%s', user.id)
  return { user, session }
}

export async function logout(ctx: Context) {
  endSession(ctx)
}

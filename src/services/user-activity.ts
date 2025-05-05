import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'

interface CreateUserActivityInput {
  userId: string
  event: string
  data: Prisma.InputJsonValue
}

export async function createUserActivity(input: CreateUserActivityInput) {
  const { userId, event, data } = input

  const ua = await prisma.user_activity.create({
    data: {
      userId,
      event,
      data
    }
  })

  return ua
}

import prisma from '../lib/prisma'

interface CreateUserActivityInput {
  userId: string
  event: string
  data: Object
}

export async function createUserActivity(input: CreateUserActivityInput) {
  const { userId, event, data } = input

  const ua = await prisma.user_activity.create({
    data: {
      userId,
      event,
      data: data ? JSON.stringify(data) : null,
      createdAt: new Date().toJSON(),
      updatedAt: new Date().toJSON()
    }
  })

  return ua
}

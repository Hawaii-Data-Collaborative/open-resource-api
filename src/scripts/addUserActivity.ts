import prisma from '../lib/prisma'

const terms = [
  ['user_1673900748707', 'food', 'free food'],
  ['user_1673987147684', 'work training', 'job training'],
  ['user_1674073545665', 'housing', 'affordable housing'],
  ['user_1674159941638', 'conseling', 'counseling'],
  ['user_1674246341624', 'debt relief', 'debt'],
  ['user_1674332740604', 'drug addiction', 'addiction'],
  ['user_1674419138582', 'domestc abuse', 'abuse'],
  ['user_1674505537532', 'alcohol help', 'alcohol'],
  ['user_1674591933477', 'help with rent', 'housing'],
  ['user_1674678333439', 'shelter waikiki', 'shelter'],
  ['user_1674764729405', 'female shelter', 'womens shelter'],
  ['user_1674851127372', 'drug abuse', 'substance abuse'],
  ['user_1674937526358', 'flood relief', 'flood'],
  ['user_1675023926229', 'disaster relief', 'natural disaster']
]

async function main() {
  for (let i = 0; i <= 13; i++) {
    const [userId, searchText] = terms[i]
    const date = new Date(Number(userId.split('_')[1]) + 1000 * Math.round(Math.random() * 20))
    const ua = await prisma.user_activity.create({
      data: {
        userId,
        event: 'Search.Keyword',
        data: JSON.stringify({ radius: 0, terms: searchText }),
        createdAt: new Date(date).toJSON(),
        updatedAt: new Date(date).toJSON()
      }
    })
    console.log('created id=%s', ua.id)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

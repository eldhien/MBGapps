const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
prisma.$connect()
  .then(() => {
    console.log('DB connected')
    return process.exit(0)
  })
  .catch((err) => {
    console.log('DB connection error:', err.message)
    process.exit(1)
  })
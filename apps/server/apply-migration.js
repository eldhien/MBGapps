import { spawn } from 'child_process'

const prismaBin = 'node_modules/@prisma/managed-platform/dist/bin/get-platform.js'

try {
  const result = spawn.sync(
    'node',
    [prismaBin, 'migrate', 'dev', '--name', 'add_kitchen_checklists', '--schema=prisma/schema.prisma'],
    { cwd: 'apps/server', stdio: 'inherit' }
  )
  process.exit(result.status ?? 0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
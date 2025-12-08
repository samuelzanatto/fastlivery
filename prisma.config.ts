import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Usa DIRECT_URL (session mode, porta 5432) para migrações
    // Isso evita problemas com prepared statements no pooler transaction mode
    url: env('DIRECT_URL'),
  },
})

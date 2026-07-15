import Fastify from 'fastify'
import { b2bRoutes } from './routes/b2b'
import { pool } from './db/connection'
import { webhookWorker } from './b2b/webhooks/webhookWorker'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'

const app = Fastify({ logger: true })

app.register(fastifyCookie)
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'super-secret-key-replace-me'
})

app.decorate('pg', pool)

app.register(b2bRoutes)

app.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`B2B Gateway listening at ${address}`)
})

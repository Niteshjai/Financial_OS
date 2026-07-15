import { Worker, Job } from 'bullmq'
import { Pool } from 'pg'
import crypto from 'crypto'
import { pool } from '../../db/connection'

const redisConnection = {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
}

// 1s, 5s, 30s, 5m, 30m
const backoffDelays = [1000, 5000, 30000, 300000, 1800000]

export const webhookWorker = new Worker(
  'b2b-webhooks',
  async (job: Job) => {
    const { deliveryId, clientId, webhookUrl, payload, eventType } = job.data

    const clientResult = await pool.query(
      'SELECT webhook_secret, contact_email, business_name FROM b2b_clients WHERE id=$1',
      [clientId]
    )
    const client = clientResult.rows[0]
    
    if (!client || !client.webhook_secret) {
      throw new Error('Client or webhook_secret not found')
    }

    const payloadString = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', client.webhook_secret)
      .update(payloadString)
      .digest('hex')

    await pool.query(
      `UPDATE b2b_webhook_deliveries 
       SET attempts = attempts + 1, last_attempt_at = NOW(), status = 'retrying'
       WHERE id = $1`,
      [deliveryId]
    )

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AssetMap-Event': eventType,
        'X-AssetMap-Signature': `sha256=${signature}`
      },
      body: payloadString
    })

    const responseBody = await response.text()

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${responseBody}`)
    }

    // Success
    await pool.query(
      `UPDATE b2b_webhook_deliveries 
       SET status = 'delivered', delivered_at = NOW(), response_code = $2, response_body = $3
       WHERE id = $1`,
      [deliveryId, response.status, responseBody.substring(0, 500)]
    )

    return { success: true }
  },
  {
    connection: redisConnection,
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        return backoffDelays[attemptsMade - 1] || backoffDelays[backoffDelays.length - 1]
      }
    }
  }
)

webhookWorker.on('failed', async (job, err) => {
  if (!job) return;
  if (job.attemptsMade === job.opts.attempts) {
    const { deliveryId, clientId } = job.data
    await pool.query(
      `UPDATE b2b_webhook_deliveries 
       SET status = 'failed', response_body = $2
       WHERE id = $1`,
      [deliveryId, err.message]
    )

    // Simulate sending an email to the client contact
    console.error(`Webhook delivery failed permanently for client ${clientId}: ${err.message}`)
    // sendEmail(client.contact_email, "Webhook delivery failing", ...)
  }
})

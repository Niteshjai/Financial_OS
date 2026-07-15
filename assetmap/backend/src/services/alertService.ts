import axios from 'axios'
import { Pool } from 'pg'
import { redis } from '../db/connection'

const MSG91_AUTH = process.env.MSG91_AUTH_KEY!
const MSG91_TEMPLATE_BALANCE_DROP = process.env.MSG91_TEMPLATE_BALANCE_DROP!
const MSG91_TEMPLATE_NEW_ACCOUNT  = process.env.MSG91_TEMPLATE_NEW_ACCOUNT!
const MSG91_TEMPLATE_LAND_CHANGE  = process.env.MSG91_TEMPLATE_LAND_CHANGE!
const MSG91_SENDER = process.env.MSG91_SENDER_ID || 'ASSETM'

export interface AlertPayload {
  userId:    string
  type:      string
  severity:  'info' | 'warning' | 'critical'
  title:     string
  body:      string
  metadata?: object
}

function formatINR(paise: number): string {
  const amount = paise / 100
  if (amount >= 10000000) return `₹${(amount/10000000).toFixed(2)}Cr`
  if (amount >= 100000)   return `₹${(amount/100000).toFixed(1)}L`
  if (amount >= 1000)     return `₹${(amount/1000).toFixed(0)}K`
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export const alertService = {

  async createAlert(pool: Pool, payload: AlertPayload): Promise<string> {
    const result = await pool.query(`
      INSERT INTO user_alerts (
        user_id, alert_type, severity, title, body, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id
    `, [
      payload.userId, payload.type, payload.severity,
      payload.title, payload.body,
      JSON.stringify(payload.metadata ?? {})
    ])
    return result.rows[0].id
  },

  async sendSMS(userId: string, mobile: string, message: string, templateId: string): Promise<boolean> {
    try {
      const date = new Date().toISOString().split('T')[0]
      const redisKey = `sms:count:${userId}:${date}`
      
      const countStr = await redis.get(redisKey)
      const count = countStr ? parseInt(countStr) : 0
      
      if (count >= 3) {
        console.warn(`[AlertService] SMS limit reached for user ${userId} today`)
        return false
      }

      await axios.post(
        'https://api.msg91.com/api/v5/flow/',
        {
          template_id: templateId,
          sender:      MSG91_SENDER,
          mobiles:     `91${mobile}`,
          VAR1:        message,
        },
        { headers: { authkey: MSG91_AUTH } }
      )
      
      await redis.incr(redisKey)
      if (count === 0) {
        await redis.expire(redisKey, 24 * 60 * 60)
      }
      
      return true
    } catch (err) {
      console.error('[AlertService] SMS failed:', err)
      return false
    }
  },

  async sendPushNotification(
    pool: Pool,
    userId: string,
    title: string,
    body: string
  ): Promise<boolean> {
    // FCM implementation — use firebase-admin
    try {
      const admin = require('firebase-admin')
      if (!admin.apps.length) {
        if (!process.env.FIREBASE_PROJECT_ID) return false;
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }

      const tokenResult = await pool.query(
        'SELECT fcm_token FROM users WHERE id = $1',
        [userId]
      )
      const token = tokenResult.rows[0]?.fcm_token
      if (!token) return false

      await admin.messaging().send({
        token,
        notification: { title, body },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } }
      })
      return true
    } catch (err) {
      console.error('[AlertService] Push failed:', err)
      return false 
    }
  },

  async getUnreadCount(pool: Pool, userId: string): Promise<number> {
    const r = await pool.query(
      'SELECT COUNT(*) FROM user_alerts WHERE user_id=$1 AND is_read=false',
      [userId]
    )
    return parseInt(r.rows[0].count)
  },

  async getUserAlerts(
    pool: Pool,
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<any[]> {
    const r = await pool.query(`
      SELECT * FROM user_alerts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])
    return r.rows
  },

  async markAllRead(pool: Pool, userId: string): Promise<void> {
    await pool.query(`
      UPDATE user_alerts
      SET is_read = true, read_at = NOW()
      WHERE user_id = $1 AND is_read = false
    `, [userId])
  },

  async getPreferences(pool: Pool, userId: string): Promise<any> {
    const r = await pool.query(
      'SELECT * FROM alert_preferences WHERE user_id = $1',
      [userId]
    )
    if (r.rows[0]) return r.rows[0]

    // Insert defaults
    await pool.query(
      'INSERT INTO alert_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [userId]
    )
    return (await pool.query(
      'SELECT * FROM alert_preferences WHERE user_id = $1', [userId]
    )).rows[0]
  },

  async updatePreferences(
    pool: Pool, userId: string, prefs: Partial<any>
  ): Promise<void> {
    const fields = Object.keys(prefs)
      .filter(k => k !== 'user_id')
      .map((k, i) => `${k} = $${i + 2}`)
      .join(', ')
    const values = Object.values(prefs)
      .filter((_, i) => Object.keys(prefs)[i] !== 'user_id')

    if (!fields) return

    await pool.query(`
      INSERT INTO alert_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO UPDATE SET ${fields}, updated_at = NOW()
    `, [userId, ...values])
  }
}

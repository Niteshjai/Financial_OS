// ═══════════════════════════════════════════════════════════════
// Recovery Notifier — SMS, push, and email notifications
// ═══════════════════════════════════════════════════════════════

import { Pool } from 'pg'
import { logger } from '../../utils/logger'

interface NotificationPayload {
  channel: 'sms' | 'push' | 'email'
  title:   string
  body:    string
}

export const recoveryNotifier = {

  /**
   * Send a notification to the user for a recovery case.
   * Stores the notification record and dispatches via the appropriate channel.
   */
  async send(
    pool:    Pool,
    caseId:  string,
    userId:  string,
    payload: NotificationPayload
  ): Promise<void> {
    // Store notification record (skip in mock mode)
    if (process.env.MOCK_MODE !== 'true') {
      try {
        await pool.query(`
          INSERT INTO recovery_notifications (
            case_id, user_id, channel, title, body
          ) VALUES ($1, $2, $3, $4, $5)
        `, [caseId, userId, payload.channel, payload.title, payload.body])
      } catch (error) {
        logger.warn('Failed to store notification record', { caseId, error })
      }
    }

    // Dispatch notification
    switch (payload.channel) {
      case 'sms':
        await this.sendSMS(userId, payload.body)
        break
      case 'push':
        await this.sendPush(userId, payload.title, payload.body)
        break
      case 'email':
        await this.sendEmail(userId, payload.title, payload.body)
        break
    }
  },

  /**
   * Send SMS notification.
   * In production, integrate with Twilio.
   */
  async sendSMS(userId: string, body: string): Promise<void> {
    logger.info('SMS notification', { userId, body: body.substring(0, 100) })
    // Production: integrate with SMS gateway
  },

  /**
   * Send push notification.
   * In production, integrate with Firebase Cloud Messaging.
   */
  async sendPush(userId: string, title: string, body: string): Promise<void> {
    logger.info('Push notification', { userId, title })
    // Production: integrate with FCM
  },

  /**
   * Send email notification.
   * In production, integrate with SendGrid or AWS SES.
   */
  async sendEmail(userId: string, title: string, body: string): Promise<void> {
    logger.info('Email notification', { userId, title })
    // Production: integrate with email service
  }
}

import { logger } from '../../utils/logger';

/**
 * Nominee Notifier — Push + SMS notifications per nominee update event
 */

export interface NotificationPayload {
  channel: 'push' | 'sms' | 'both';
  title:   string;
  body:    string;
}

export const nomineeNotifier = {

  /**
   * Send a notification to the user about a nominee update event.
   * In production, this would integrate with FCM (push) and Twilio/MSG91 (SMS).
   */
  async send(userId: string, payload: NotificationPayload): Promise<void> {
    logger.info('Nominee notification sent', {
      userId,
      channel: payload.channel,
      title:   payload.title,
    });

    // TODO: Production integrations
    // Push: Firebase Cloud Messaging
    // SMS: Twilio / MSG91
  },
};

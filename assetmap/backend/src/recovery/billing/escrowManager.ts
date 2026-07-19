// ═══════════════════════════════════════════════════════════════
// Escrow Manager — Razorpay payment link creation & webhook handling
// ═══════════════════════════════════════════════════════════════

import { logger } from '../../utils/logger'

export const escrowManager = {

  /**
   * Create a Razorpay payment link for success fee collection.
   * Returns the short URL for the user to pay.
   */
  async createPaymentLink(params: {
    userId:           string
    caseId:           string
    totalPaise:       number
    assetDescription: string
    feePct:           number
    recoveredPaise:   number
  }): Promise<string> {
    // In mock mode, return a fake payment link
    if (process.env.MOCK_MODE === 'true' || !process.env.RAZORPAY_KEY_ID) {
      logger.info('Mock: would create Razorpay payment link', {
        caseId:     params.caseId,
        amount:     params.totalPaise,
      })
      return `https://rzp.io/mock/${params.caseId}`
    }

    try {
      const axios = (await import('axios')).default
      const auth = Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      ).toString('base64')

      const response = await axios.post(
        'https://api.razorpay.com/v1/payment_links',
        {
          amount:          params.totalPaise,
          currency:        'INR',
          description:     `AssetMap Recovery Fee — ${params.feePct}% of ₹${(params.recoveredPaise / 100).toLocaleString('en-IN')} recovered (${params.assetDescription})`,
          notes:           { caseId: params.caseId, userId: params.userId },
          callback_url:    `${process.env.FRONTEND_URL}/recovery/${params.caseId}/fee-paid`,
          callback_method: 'get',
          expire_by:       Math.floor(Date.now() / 1000) + 86400 * 30 // 30 days
        },
        { headers: { Authorization: `Basic ${auth}` } }
      )

      return response.data.short_url
    } catch (error) {
      logger.error('Razorpay payment link creation failed', { error, caseId: params.caseId })
      throw new Error('Failed to create payment link')
    }
  },

  /**
   * Verify Razorpay webhook signature.
   */
  verifyWebhookSignature(
    body:      string,
    signature: string
  ): boolean {
    if (process.env.MOCK_MODE === 'true') return true

    try {
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body)
        .digest('hex')

      return expectedSignature === signature
    } catch {
      return false
    }
  }
}

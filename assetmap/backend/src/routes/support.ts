import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Resend } from 'resend';
import { env } from '../config/env';
import { successResponse, errorResponse } from '../utils/constants';
import { verifyAccessToken } from '../middleware/auth';

interface SupportBody {
  subject: string;
  message: string;
}

export async function supportRoutes(app: FastifyInstance) {
  // We use preHandler hook to authenticate the user so we know who is sending the email
  app.post<{ Body: SupportBody }>('/contact', {
    preHandler: [verifyAccessToken]
  }, async (req, reply) => {
    try {
      const { subject, message } = req.body;
      const user = req.user;

      if (!subject || !message) {
        return reply.status(400).send(errorResponse('BAD_REQUEST', 'Subject and message are required'));
      }

      if (!env.RESEND_API_KEY) {
        // Fallback or dev mode warning if key is not configured
        app.log.warn(`No RESEND_API_KEY configured. Mocking email send for subject: ${subject}`);
        return reply.send(successResponse({ status: 'mock_success', message: 'Email skipped (no API key configured)' }));
      }

      const resend = new Resend(env.RESEND_API_KEY);

      const data = await resend.emails.send({
        from: 'AssetMap Support <onboarding@resend.dev>', // Resend's default test sender domain
        to: 'support@assetmap.com', // Replace with your actual support email
        subject: `[Support Request] ${subject}`,
        html: `
          <h3>New Support Request</h3>
          <p><strong>From User ID:</strong> ${user.id}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br/>')}</p>
        `,
      });

      if (data.error) {
        app.log.error('Resend error: ' + data.error);
        return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Failed to send email.'));
      }

      return reply.send(successResponse({ status: 'success', data }));
    } catch (error) {
      app.log.error('Error sending support email: ' + error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Internal server error while sending email.'));
    }
  });
}

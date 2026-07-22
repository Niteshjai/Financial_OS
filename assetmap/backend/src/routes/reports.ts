import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { verifyAccessToken } from '../middleware/auth';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants';
import { auditLogger } from '../services/auditLogger';
import { pool } from '../db/connection';
import { logger } from '../utils/logger';

const reportsRoutes: FastifyPluginAsync = async (fastify, opts) => {

  // ─────────────────────────────────────────────
  // GET /api/reports/generate
  // Trigger PDF report generation
  // ─────────────────────────────────────────────
  fastify.get('/generate', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      // Generate PDF via Python Microservice with timeout
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
      const response = await fetch(`${pythonServiceUrl}/generate-pdf?user_id=${userId}`, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('Failed to generate PDF from Python service');
      const pdfBuffer = Buffer.from(await response.arrayBuffer());

      // In production, upload to S3 and return presigned URL
      // In dev, store report reference and return inline
      const reportId = randomUUID();
      const s3Key = `reports/${userId}/${reportId}.pdf`;

      // Store report metadata
      await pool.query(
        'INSERT INTO reports (id, user_id, s3_key) VALUES ($1, $2, $3)',
        [reportId, userId, s3Key]
      );

      await auditLogger.log(userId, 'REPORT_GENERATED', 'reports', reportId, request.ip, request.headers['user-agent']);

      // For development, return the PDF directly
      if (process.env.NODE_ENV !== 'production') {
        reply.header('Content-Type', 'application/pdf');
        reply.header('Content-Disposition', `attachment; filename="AssetMap-Report-${reportId}.pdf"`);
        return reply.send(pdfBuffer);
      }

      return reply.send(successResponse({
        reportId,
        message: 'Report generated successfully',
        downloadUrl: `/api/reports/${reportId}/download`,
      }));
    } catch (error) {
      logger.error('Report generation failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to generate report'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/reports/:reportId/download
  // Download generated report
  // ─────────────────────────────────────────────
  fastify.get('/:reportId/download', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const { reportId } = request.params as Record<string, any>;

      const result = await pool.query(
        'SELECT * FROM reports WHERE id = $1 AND user_id = $2',
        [reportId, userId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send(errorResponse(ERROR_CODES.NOT_FOUND, 'Report not found'));
      }

      await auditLogger.log(userId, 'REPORT_DOWNLOADED', 'reports', reportId, request.ip, request.headers['user-agent']);

      // In production, generate presigned S3 URL
      if (process.env.NODE_ENV === 'production') {
        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_DOCUMENTS || 'assetmap-docs',
          Key: result.rows[0].s3_key
        });
        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return reply.send(successResponse({ downloadUrl: presignedUrl }));
      }

      // In dev, regenerate the PDF via Python
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
      const response = await fetch(`${pythonServiceUrl}/generate-pdf?user_id=${userId}`, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('Failed to generate PDF from Python service');
      const pdfBuffer = Buffer.from(await response.arrayBuffer());
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="AssetMap-Report-${reportId}.pdf"`);
      return reply.send(pdfBuffer);
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to download report'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/reports — List user's reports
  // ─────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const result = await pool.query(
        'SELECT id, report_type, generated_at FROM reports WHERE user_id = $1 ORDER BY generated_at DESC',
        [request.user!.id]
      );
      return reply.send(successResponse({ reports: result.rows }));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch reports'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/reports/audit-log — User's own audit trail
  // ─────────────────────────────────────────────
  fastify.get('/audit-log', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const query = request.query as Record<string, any>;
      const page = parseInt(query.page) || 1;
      const limit = Math.min(parseInt(query.limit) || 20, 100);

      const trail = await auditLogger.getUserAuditTrail(userId, page, limit);

      await auditLogger.log(userId, 'AUDIT_LOG_VIEWED', 'audit_logs', undefined, request.ip, request.headers['user-agent']);

      return reply.send(successResponse(trail));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch audit trail'));
    }
  });
};

export default reportsRoutes;

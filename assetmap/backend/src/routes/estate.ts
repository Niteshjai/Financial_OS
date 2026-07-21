import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { EstateFileSchema } from '../utils/validators';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants';
import { encryptPII, hashAadhaar } from '../utils/encryption';
import { EstateCaseModel } from '../models/estateCase';
import { auditLogger } from '../services/auditLogger';
import { logger } from '../utils/logger';
import { verifyAccessToken } from '../middleware/auth';

const estateRoutes: FastifyPluginAsync = async (fastify, opts) => {

  // ─────────────────────────────────────────────
  // POST /api/estate/file
  // ─────────────────────────────────────────────
  fastify.post('/file', {
    schema: { body: EstateFileSchema },
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const parts = request.parts();
      let deceasedName, deceasedAadhaar, relationship;
      let deathCertExt, legalHeirExt;
      let hasDeathCert = false;
      let hasLegalHeir = false;

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === 'deathCertificate') {
            hasDeathCert = true;
            deathCertExt = getExtension(part.filename);
            await part.toBuffer(); // consume stream
          } else if (part.fieldname === 'legalHeirDoc') {
            hasLegalHeir = true;
            legalHeirExt = getExtension(part.filename);
            await part.toBuffer(); // consume stream
          }
        } else {
          if (part.fieldname === 'deceasedName') deceasedName = part.value;
          if (part.fieldname === 'deceasedAadhaar') deceasedAadhaar = part.value;
          if (part.fieldname === 'relationship') relationship = part.value;
        }
      }

      if (!hasDeathCert || !hasLegalHeir) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Both death certificate and legal heir document are required'));
      }

      if (!deceasedName || !deceasedAadhaar || !relationship) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Missing required form fields'));
      }

      const userId = request.user!.id;

      let deathCertS3Key: string;
      let legalHeirS3Key: string;

      if (process.env.NODE_ENV === 'production') {
        deathCertS3Key = `estate/${userId}/${randomUUID()}/death-certificate${deathCertExt}`;
        legalHeirS3Key = `estate/${userId}/${randomUUID()}/legal-heir-doc${legalHeirExt}`;
      } else {
        deathCertS3Key = `dev/estate/${userId}/${randomUUID()}/death-certificate.pdf`;
        legalHeirS3Key = `dev/estate/${userId}/${randomUUID()}/legal-heir-doc.pdf`;
      }

      const caseId = await EstateCaseModel.create({
        filedByUserId: userId,
        deceasedNameEncrypted: encryptPII(deceasedName as string),
        deceasedAadhaarHash: hashAadhaar(deceasedAadhaar as string),
        deathCertificateS3Key: deathCertS3Key,
        legalHeirDocS3Key: legalHeirS3Key,
      });

      await auditLogger.log(
        userId,
        'ESTATE_FILED',
        'estate_cases',
        caseId,
        request.ip,
        request.headers['user-agent'],
        { relationship }
      );

      return reply.status(201).send(successResponse({
        caseId,
        status: 'PENDING',
        message: 'Estate case filed successfully. Documents are under verification.',
      }));
    } catch (error) {
      logger.error('Estate filing failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.ESTATE_UPLOAD_FAILED, 'Failed to file estate case'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/estate/:caseId
  // ─────────────────────────────────────────────
  fastify.get('/:caseId', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as Record<string, any>;
      const estateCase = await EstateCaseModel.findById(caseId);

      if (!estateCase) {
        return reply.status(404).send(errorResponse(ERROR_CODES.ESTATE_NOT_FOUND, 'Estate case not found'));
      }

      if (estateCase.filedByUserId !== request.user!.id) {
        return reply.status(403).send(errorResponse(ERROR_CODES.UNAUTHORIZED, 'Access denied'));
      }

      return reply.send(successResponse(estateCase));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch estate case'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/estate/:caseId/assets
  // ─────────────────────────────────────────────
  fastify.get('/:caseId/assets', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as Record<string, any>;
      const estateCase = await EstateCaseModel.findById(caseId);

      if (!estateCase) {
        return reply.status(404).send(errorResponse(ERROR_CODES.ESTATE_NOT_FOUND, 'Estate case not found'));
      }

      if (estateCase.filedByUserId !== request.user!.id) {
        return reply.status(403).send(errorResponse(ERROR_CODES.UNAUTHORIZED, 'Access denied'));
      }

      if (estateCase.status !== 'VERIFIED' && estateCase.status !== 'COMPLETE') {
        return reply.status(400).send(errorResponse(ERROR_CODES.ESTATE_NOT_VERIFIED, 'Estate case must be verified before assets can be viewed'));
      }

      const mockDiscoveredAssets = {
        deceasedName: estateCase.deceasedName,
        discoveredAssets: [
          {
            fiType: 'DEPOSIT',
            institutionName: 'State Bank of India',
            accountRef: 'XXXX9876',
            balance: 325000.00,
            currency: 'INR',
          },
          {
            fiType: 'INSURANCE_POLICIES',
            institutionName: 'LIC of India',
            accountRef: 'LIC-8765432',
            balance: 5000000.00,
            currency: 'INR',
          },
          {
            fiType: 'MUTUAL_FUND',
            institutionName: 'HDFC AMC',
            accountRef: 'HDFCMF-321',
            balance: 450000.00,
            currency: 'INR',
          },
        ],
        totalDiscoveredValue: 5775000.00,
      };

      await auditLogger.log(
        request.user!.id,
        'ESTATE_ASSETS_VIEWED',
        'estate_cases',
        caseId,
        request.ip,
        request.headers['user-agent']
      );

      return reply.send(successResponse(mockDiscoveredAssets));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch estate assets'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/estate
  // ─────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const cases = await EstateCaseModel.findByUserId(request.user!.id);
      return reply.send(successResponse({ cases }));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch estate cases'));
    }
  });
};

function getExtension(filename: string): string {
  const ext = filename.split('.').pop();
  return ext ? `.${ext}` : '';
}

export default estateRoutes;

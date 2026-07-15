export function generateOpenApiSpec(businessType: string) {
  return {
    openapi: '3.0.0',
    info: {
      title: 'AssetMap B2B API',
      version: '1.0.0',
      description: `B2B API endpoints optimized for ${businessType}`
    },
    paths: {
      '/b2b/v1/user/{userId}/profile': {
        get: {
          summary: 'Get User Data',
          parameters: [
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Successful Response'
            }
          }
        }
      }
    }
  }
}

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from '../config/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Plum OPD Claim Adjudication API',
      version: '1.0.0',
      description: 'API documentation for the Plum OPD Claim Adjudication Tool',
    },
    servers: [
      {
        url: env.NODE_ENV === 'production' ? 'https://plum-assignment-dfjt.onrender.com' : `http://localhost:${env.PORT}`,
        description: env.NODE_ENV === 'production' ? 'Production server' : 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './dist/routes/*.js', 
    './src/routes/*.ts', 
    './dist/models/*.js', 
    './src/models/*.ts'
  ], // Path to the API docs
};

const specs = swaggerJsdoc(options) as any;

specs.paths = {
  ...(specs.paths || {}),
  '/health': {
    get: {
      summary: 'Health check',
      tags: ['System'],
      responses: { 200: { description: 'Server is healthy' } }
    }
  },
  '/api/auth/refresh': {
    post: {
      summary: 'Refresh access token',
      tags: ['Auth'],
      responses: {
        200: { description: 'New access token issued' },
        401: { description: 'Invalid or expired refresh token' }
      }
    }
  },
  '/api/auth/logout': {
    post: {
      summary: 'Logout current user',
      tags: ['Auth'],
      responses: { 200: { description: 'Logged out' } }
    }
  },
  '/api/claims/{id}/stream': {
    get: {
      summary: 'Stream claim processing status',
      tags: ['Claims'],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Server-sent event stream' } }
    }
  },
  '/api/claims/{id}/chat': {
    post: {
      summary: 'Ask RAG chat about a claim',
      tags: ['Claims'],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['message'],
              properties: { message: { type: 'string' } }
            }
          }
        }
      },
      responses: {
        200: { description: 'RAG answer with sources' },
        400: { description: 'Invalid query' }
      }
    }
  },
  '/api/admin/policy/activate': {
    post: {
      summary: 'Activate a policy version',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['version', 'confirmationText'],
              properties: {
                version: { type: 'number' },
                confirmationText: { type: 'string', example: 'CONFIRM' }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Policy activated' } }
    }
  },
  '/api/admin/generated-samples': {
    get: {
      summary: 'List generated sample documents',
      tags: ['Admin'],
      responses: { 200: { description: 'Generated sample folders and files' } }
    }
  },
  '/api/admin/suggest-sample-data': {
    post: {
      summary: 'Suggest realistic sample document data',
      tags: ['Admin'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['docType'],
              properties: { docType: { type: 'string' } }
            }
          }
        }
      },
      responses: { 200: { description: 'Suggested sample data' } }
    }
  },
  '/api/admin/users': {
    get: {
      summary: 'List users',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Users list' } }
    },
    post: {
      summary: 'Create reviewer/admin user',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'name', 'role', 'temporaryPassword'],
              properties: {
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string', enum: ['admin', 'reviewer', 'viewer'] },
                temporaryPassword: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'User created' } }
    }
  }
};

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  console.log(`Swagger docs available at /api-docs`);
}

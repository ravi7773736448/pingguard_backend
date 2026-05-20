import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Website Monitoring API',
      version: '1.0.0',
      description: `
## Overview
Production-ready REST API for website monitoring system with real-time updates.

## Features
- 🔐 JWT Authentication (Register, Login, Logout)
- 🌐 Website Monitoring (Add, Update, Delete, Check)
- 📊 Analytics & Reporting (Uptime, Response Time, Incidents)
- 🔔 Real-time Notifications (Socket.IO)
- 📈 Dashboard Overview

## Authentication
All protected endpoints require JWT Bearer token in Authorization header.
Use /api/auth/login to obtain a token, then click "Authorize" button.
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: process.env.PROD_URL || 'https://api.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: `
## JWT Authentication
Enter your JWT token to authenticate requests.

**How to get token:**
1. POST /api/auth/login with valid credentials
2. Copy the "token" from response
3. Click "Authorize" button and enter: Bearer <your-token>

Example: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
          `
        }
      },
      schemas: {
        // Auth Schemas
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 2,
              maxLength: 30,
              example: 'johndoe',
              description: 'Unique username (alphanumeric, underscore, hyphen)'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
              description: 'Valid email address'
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 128,
              example: 'SecurePass123',
              description: 'Password with at least: 1 uppercase, 1 lowercase, 1 number'
            },
            name: {
              type: 'string',
              maxLength: 100,
              example: 'John Doe',
              description: 'Optional display name'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            password: {
              type: 'string',
              example: 'SecurePass123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                username: { type: 'string', example: 'johndoe' },
                email: { type: 'string', example: 'john@example.com' }
              }
            }
          }
        },

        // Website Schemas
        Website: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            url: { type: 'string', example: 'https://example.com' },
            name: { type: 'string', example: 'My Website' },
            status: { type: 'string', enum: ['UP', 'DOWN', 'SLOW', 'UNKNOWN'], example: 'UP' },
            lastCheckedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
            lastResponseTime: { type: 'number', example: 250 },
            uptimePercentage: { type: 'number', example: 99.5 },
            checkInterval: { type: 'number', example: 60 },
            alertEnabled: { type: 'boolean', example: true }
          }
        },
        CreateWebsiteRequest: {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com',
              description: 'Valid HTTPS URL to monitor'
            },
            name: {
              type: 'string',
              maxLength: 100,
              example: 'My Website',
              description: 'Optional display name'
            },
            checkInterval: {
              type: 'number',
              minimum: 10,
              maximum: 3600,
              example: 60,
              description: 'Check interval in seconds (default: 60)'
            },
            responseThreshold: {
              type: 'number',
              minimum: 500,
              maximum: 30000,
              example: 3000,
              description: 'Response time threshold in ms to mark as SLOW'
            },
            alertEnabled: {
              type: 'boolean',
              example: true,
              description: 'Enable email alerts for status changes'
            },
            region: {
              type: 'string',
              maxLength: 50,
              example: 'India',
              description: 'Geographic region for monitoring'
            }
          }
        },

        // Analytics Schemas
        Analytics: {
          type: 'object',
          properties: {
            uptime: { type: 'number', example: 98.5 },
            totalChecks: { type: 'number', example: 1440 },
            statusBreakdown: {
              type: 'object',
              properties: {
                up: { type: 'number', example: 1400 },
                down: { type: 'number', example: 20 },
                slow: { type: 'number', example: 20 }
              }
            },
            responseTime: {
              type: 'object',
              properties: {
                average: { type: 'number', example: 250 },
                min: { type: 'number', example: 50 },
                max: { type: 'number', example: 5000 }
              }
            },
            period: { type: 'string', example: '24 hours' }
          }
        },
        Incident: {
          type: 'object',
          properties: {
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            duration: { type: 'number', example: 300 },
            occurrences: { type: 'number', example: 5 },
            errorType: { type: 'string', example: 'TIMEOUT' }
          }
        },

        // Common Responses
        Error400: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Invalid email format' }
                }
              }
            }
          }
        },
        Error401: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid token' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'token' },
                  message: { type: 'string', example: 'Authentication token is invalid' }
                }
              }
            }
          }
        },
        Error404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Resource not found' }
          }
        },
        Error429: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Too many requests' }
          }
        },
        Error500: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Internal server error' }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error400' }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing authentication',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error401' }
            }
          }
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error404' }
            }
          }
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error429' }
            }
          }
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error500' }
            }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints for user registration and login'
      },
      {
        name: 'Websites',
        description: 'Website monitoring CRUD operations'
      },
      {
        name: 'Analytics',
        description: 'Website analytics, logs, and incident reporting'
      },
      {
        name: 'Health',
        description: 'System health check endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/docs/*.yaml']
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    syntaxHighlight: {
      activated: true,
      theme: 'agate'
    },
    onComplete: function() {
      console.log('✅ Swagger UI loaded successfully');
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { font-size: 2.5em }
    .swagger-ui .info .description { font-size: 1.1em; line-height: 1.5; }
    .swagger-ui .btn.authorize { background-color: #2ecc71; border-color: #2ecc71; }
    .swagger-ui .btn.authorize:hover { background-color: #27ae60; }
    .swagger-ui .scheme-container { padding: 10px; background: #f8f9fa; border-radius: 5px; }
    .swagger-ui .opblock-tag { font-size: 1.2em; font-weight: 600; }
    .swagger-ui .opblock { margin-bottom: 10px; border-radius: 5px; }
  `,
  customSiteTitle: 'Website Monitoring API Docs',
  customfavicon: 'https://swagger.io/favicon.ico'
};

export const getOpenAPISpec = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
};

export default swaggerSpec;

export const swaggerRouter = [
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerOptions)
];
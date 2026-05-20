import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  registerWebsite,
  getWebsites,
  getWebsiteById,
  updateWebsite,
  deleteWebsite,
  triggerCheck,
  getWebsiteLogs,
  getWebsiteAnalyticsController,
  getDashboardSummary,
  getIncidents,
  getAllIncidents
} from '../controllers/website.controller.js';
import {
  createWebsiteValidator,
  updateWebsiteValidator,
  websiteIdValidator,
  triggerCheckValidator
} from '../validators/website.validator.js';
import {
  analyticsQueryValidator,
  incidentsQueryValidator,
  logsQueryValidator,
  dashboardSummaryValidator
} from '../validators/analytics.validator.js';
import { handleValidationErrors } from '../utils/validation-error-handler.js';
import { validateObjectId } from '../middleware/validation/objectid.middleware.js';
import { validatePagination } from '../middleware/validation/query.validator.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/website:
 *   post:
 *     summary: Create new website
 *     description: Add a new website to monitoring
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWebsiteRequest'
 *           example:
 *             url: https://example.com
 *             name: Example Website
 *             checkInterval: 60
 *             responseThreshold: 3000
 *             alertEnabled: true
 *             region: India
 *     responses:
 *       201:
 *         description: Website created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post('/', createWebsiteValidator, handleValidationErrors, registerWebsite);

/**
 * @swagger
 * /api/website:
 *   get:
 *     summary: Get all websites
 *     description: Retrieve all websites owned by the authenticated user
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of websites
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', getWebsites);

/**
 * @swagger
 * /api/website/dashboard/summary:
 *   get:
 *     summary: Get dashboard summary
 *     description: Get overview of all websites with status counts
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *     responses:
 *       200:
 *         description: Dashboard summary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/dashboard/summary', dashboardSummaryValidator, handleValidationErrors, getDashboardSummary);

/**
 * @swagger
 * /api/website/{id}:
 *   get:
 *     summary: Get website by ID
 *     description: Get details of a specific website
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Website ID
 *     responses:
 *       200:
 *         description: Website details
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validateObjectId('id'), handleValidationErrors, getWebsiteById);

/**
 * @swagger
 * /api/website/{id}:
 *   put:
 *     summary: Update website
 *     description: Update website settings
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *     requestBody:
 *       content:
 *         application/json:
 *           example:
 *             name: Updated Name
 *             checkInterval: 120
 *             alertEnabled: false
 *     responses:
 *       200:
 *         description: Website updated
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', updateWebsiteValidator, handleValidationErrors, updateWebsite);

/**
 * @swagger
 * /api/website/{id}:
 *   delete:
 *     summary: Delete website
 *     description: Remove a website from monitoring
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *     responses:
 *       200:
 *         description: Website deleted
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', validateObjectId('id'), handleValidationErrors, deleteWebsite);

/**
 * @swagger
 * /api/website/{id}/check:
 *   post:
 *     summary: Trigger manual check
 *     description: Immediately check a website's status
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *     responses:
 *       200:
 *         description: Check completed
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/:id/check', triggerCheckValidator, handleValidationErrors, triggerCheck);

/**
 * @swagger
 * /api/website/{id}/logs:
 *   get:
 *     summary: Get website logs
 *     description: Retrieve monitoring history for a website
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 200
 *           default: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UP, DOWN, SLOW]
 *     responses:
 *       200:
 *         description: List of logs
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/:id/logs', logsQueryValidator, handleValidationErrors, getWebsiteLogs);

/**
 * @swagger
 * /api/website/{id}/analytics:
 *   get:
 *     summary: Get website analytics
 *     description: Retrieve uptime stats, response times and hourly data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 8760
 *           default: 24
 *         description: Hours of data to analyze
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hour, day, week]
 *           default: hour
 *     responses:
 *       200:
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   $ref: '#/components/schemas/Analytics'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.get('/:id/analytics', analyticsQueryValidator, handleValidationErrors, getWebsiteAnalyticsController);

/**
 * @swagger
 * /api/website/{id}/incidents:
 *   get:
 *     summary: Get downtime incidents
 *     description: Get periods when website was down
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 7
 *     responses:
 *       200:
 *         description: List of incidents
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/:id/incidents', incidentsQueryValidator, handleValidationErrors, getIncidents);

router.get('/incidents/all', getAllIncidents);

export default router;
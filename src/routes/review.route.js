import express from 'express'
import { submitReview, getPublicReviews } from '../controllers/review.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public route to fetch reviews for landing page
router.get('/', getPublicReviews)

// Protected route to submit a new review from dashboard
router.post('/', authenticate, submitReview)

export default router

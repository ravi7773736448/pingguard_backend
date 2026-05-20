import Review from '../models/review.model.js'

export const submitReview = async (req, res) => {
  try {
    const { content, rating, role } = req.body

    if (!content || !rating || !role) {
      return res.status(400).json({ error: 'Please provide content, rating, and your role.' })
    }

    const review = await Review.create({
      user: req.user.userId,
      content,
      rating,
      role
    })

    res.status(201).json({ message: 'Review submitted successfully', review })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You have already submitted a review' })
    }
    console.error('Submit review error:', error)
    res.status(500).json({ error: 'Failed to submit review' })
  }
}

export const getPublicReviews = async (req, res) => {
  try {
    // Fetch approved reviews, populate user name, limit to top 10 most recent
    const reviews = await Review.find({ isApproved: true })
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    // Format the response to match what the frontend expects
    const formattedReviews = reviews.map(review => ({
      _id: review._id,
      name: review.user?.username || 'Anonymous User',
      role: review.role,
      content: review.content,
      rating: review.rating,
      createdAt: review.createdAt
    }))

    res.status(200).json(formattedReviews)
  } catch (error) {
    console.error('Fetch reviews error:', error)
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
}

import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  role: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  isApproved: {
    type: Boolean,
    default: true // Default to true for this demo so it shows instantly
  }
}, {
  timestamps: true
})

const Review = mongoose.model('Review', reviewSchema)
export default Review

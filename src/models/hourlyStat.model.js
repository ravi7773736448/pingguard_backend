import mongoose from 'mongoose';

const hourlyStatSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
    index: true
  },

  timestamp: {
    type: Date,
    required: true,
    index: true
  },

  totalChecks: {
    type: Number,
    required: true,
    default: 0
  },

  upCount: {
    type: Number,
    required: true,
    default: 0
  },

  downCount: {
    type: Number,
    required: true,
    default: 0
  },

  slowCount: {
    type: Number,
    required: true,
    default: 0
  },

  avgResponseTime: {
    type: Number,
    required: true,
    default: 0
  },

  minResponseTime: {
    type: Number,
    default: null
  },

  maxResponseTime: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

// Ensure a single website has exactly one hourly stat document per hourly window
hourlyStatSchema.index({ websiteId: 1, timestamp: -1 }, { unique: true });

const HourlyStat = mongoose.model('HourlyStat', hourlyStatSchema);

export default HourlyStat;

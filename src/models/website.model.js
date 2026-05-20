import mongoose from 'mongoose';

const websiteSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP(S) URL'
    }
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  name: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },

  checkInterval: {
    type: Number,
    default: 60,
    min: 10,
    max: 3600
  },

  responseThreshold: {
    type: Number,
    default: 3000,
    min: 500,
    max: 30000
  },

  status: {
    type: String,
    enum: ['UP', 'DOWN', 'SLOW', 'UNKNOWN'],
    default: 'UNKNOWN'
  },

  lastKnownStatus: {
    type: String,
    enum: ['UP', 'DOWN', 'SLOW', 'UNKNOWN'],
    default: 'UNKNOWN'
  },

  lastResponseTime: {
    type: Number,
    default: null
  },

  lastStatusCode: {
    type: Number,
    default: null
  },

  lastCheckedAt: {
    type: Date,
    default: null
  },

  alertEnabled: {
    type: Boolean,
    default: true
  },

  alertSent: {
    type: Boolean,
    default: false
  },

  lastAlertSentAt: {
    type: Date,
    default: null
  },

  region: {
    type: String,
    default: 'India'
  },

  isPaused: {
    type: Boolean,
    default: false
  },

  uptimePercentage: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },

  totalChecks: {
    type: Number,
    default: 0
  },

  successfulChecks: {
    type: Number,
    default: 0
  },

  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    default: 'GET'
  },

  headers: {
    type: Map,
    of: String,
    default: {}
  },

  body: {
    type: String,
    default: ''
  },

  expectedStatus: {
    type: Number,
    default: 200,
    min: 100,
    max: 599
  },

  timeout: {
    type: Number,
    default: 10000,
    min: 1000,
    max: 30000
  },

  responseValidationType: {
    type: String,
    enum: ['CONTAINS', 'JSON_MATCH', 'NONE'],
    default: 'NONE'
  },

  responseValidationValue: {
    type: String,
    default: ''
  }

}, {
  timestamps: true
});

websiteSchema.index({ userId: 1, status: 1 });
websiteSchema.index({ lastCheckedAt: 1 });
websiteSchema.index({ createdAt: -1 });

websiteSchema.methods.updateUptime = async function(success) {
  this.totalChecks += 1;
  if (success) {
    this.successfulChecks += 1;
  }
  this.uptimePercentage = Math.round((this.successfulChecks / this.totalChecks) * 100);
  return this.save();
};

websiteSchema.virtual('isHealthy').get(function() {
  return this.status === 'UP' || this.status === 'SLOW';
});

websiteSchema.set('toJSON', { virtuals: true });
websiteSchema.set('toObject', { virtuals: true });

const Website = mongoose.model('Website', websiteSchema);

export default Website;
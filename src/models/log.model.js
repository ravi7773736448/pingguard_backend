import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
    index: true
  },

  status: {
    type: String,
    enum: ['UP', 'DOWN', 'SLOW'],
    required: true,
    index: true
  },

  responseTime: {
    type: Number,
    required: true
  },

  statusCode: {
    type: Number,
    default: null
  },

  errorType: {
    type: String,
    default: null
  },

  checkedAt: {
    type: Date,
    default: Date.now,
    index: true
  }

}, {
  timestamps: true
});

logSchema.index({ websiteId: 1, checkedAt: -1 });
logSchema.index({ websiteId: 1, status: 1 });
logSchema.index({ checkedAt: -1, status: 1 });
logSchema.index({ checkedAt: 1 }, { expireAfterSeconds: 2592000 }); // TTL index: auto-delete raw logs after 30 days


logSchema.statics.getUptimeStats = async function(websiteId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        websiteId: new mongoose.Types.ObjectId(websiteId),
        checkedAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' }
      }
    }
  ]);
};

logSchema.statics.getRecentLogs = async function(websiteId, limit = 100) {
  return this.find({ websiteId })
    .sort({ checkedAt: -1 })
    .limit(limit)
    .lean();
};

logSchema.statics.getHourlyStats = async function(websiteId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        websiteId: new mongoose.Types.ObjectId(websiteId),
        checkedAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$checkedAt' },
          month: { $month: '$checkedAt' },
          day: { $dayOfMonth: '$checkedAt' },
          hour: { $hour: '$checkedAt' }
        },
        count: { $sum: 1 },
        upCount: {
          $sum: { $cond: [{ $eq: ['$status', 'UP'] }, 1, 0] }
        },
        downCount: {
          $sum: { $cond: [{ $eq: ['$status', 'DOWN'] }, 1, 0] }
        },
        slowCount: {
          $sum: { $cond: [{ $eq: ['$status', 'SLOW'] }, 1, 0] }
        },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    { $sort: { '_id': -1 } }
  ]);
};

const Log = mongoose.model('Log', logSchema);

export default Log;
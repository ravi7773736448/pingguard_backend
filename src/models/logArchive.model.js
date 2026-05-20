import mongoose from 'mongoose';

const logArchiveSchema = new mongoose.Schema({
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
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'logarchives' // Force explicit collection name
});

logArchiveSchema.index({ websiteId: 1, checkedAt: -1 });

const LogArchive = mongoose.model('LogArchive', logArchiveSchema);

export default LogArchive;

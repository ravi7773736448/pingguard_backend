import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
    index: true
  },

  websiteName: {
    type: String,
    required: true,
    trim: true
  },

  startTime: {
    type: Date,
    required: true
  },

  endTime: {
    type: Date,
    default: null
  },

  duration: {
    type: Number,
    default: null
  },

  errorType: {
    type: String,
    default: null
  },

  aiSummary: {
    type: String,
    default: null
  }

}, {
  timestamps: true
});

incidentSchema.index({ websiteId: 1, createdAt: -1 });

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;
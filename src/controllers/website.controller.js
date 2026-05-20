import Website from '../models/website.model.js';
import Log from '../models/log.model.js';
import Incident from '../models/incident.model.js';
import { checkSingleWebsite } from '../services/monitor.service.js';
import { getWebsiteAnalytics, getAllWebsitesOverview, getDowntimeIncidents, getAllUserIncidents } from '../services/analytics.service.js';

const handleError = (error, res, context = '') => {
  console.error(`[ERROR] ${context}:`, error.message);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors || []
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      errors: [{ field: 'id', message: 'Invalid ObjectId format' }]
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errors: [{ field: 'url', message: 'This website is already registered' }]
    });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
};

export const registerWebsite = async (req, res) => {
  try {
    const { 
      url, 
      name, 
      checkInterval, 
      responseThreshold, 
      alertEnabled, 
      region,
      method,
      headers,
      body,
      expectedStatus,
      timeout,
      responseValidationType,
      responseValidationValue
    } = req.body;
    const userId = req.user.userId;

    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;

    const existingWebsite = await Website.findOne({
      url: formattedUrl,
      userId
    });

    if (existingWebsite) {
      return res.status(400).json({
        success: false,
        message: 'Website already registered',
        errors: [{ field: 'url', message: 'This URL is already registered for your account' }]
      });
    }

    const website = await Website.create({
      url: formattedUrl,
      name: name || formattedUrl,
      userId,
      checkInterval: checkInterval || 60,
      responseThreshold: responseThreshold || 3000,
      alertEnabled: alertEnabled !== false,
      region: region || 'India',
      method: method || 'GET',
      headers: headers || {},
      body: body || '',
      expectedStatus: expectedStatus || 200,
      timeout: timeout || 10000,
      responseValidationType: responseValidationType || 'NONE',
      responseValidationValue: responseValidationValue || ''
    });

    checkSingleWebsite(website).catch(err => {
      console.error('[MONITOR] Initial check failed:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Website added successfully',
      website: {
        id: website._id,
        url: website.url,
        name: website.name,
        status: website.status,
        checkInterval: website.checkInterval,
        alertEnabled: website.alertEnabled,
        region: website.region,
        method: website.method,
        headers: website.headers,
        body: website.body,
        expectedStatus: website.expectedStatus,
        timeout: website.timeout,
        responseValidationType: website.responseValidationType,
        responseValidationValue: website.responseValidationValue
      }
    });

  } catch (error) {
    handleError(error, res, 'registerWebsite');
  }
};

export const getWebsites = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const websites = await Website.find({ userId })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: websites.length,
      websites
    });

  } catch (error) {
    console.error('[WEBSITE]', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch websites'
    });
  }
};

export const getWebsiteById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const website = await Website.findOne({ _id: id, userId }).lean();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found',
        errors: [{ field: 'id', message: 'You do not have access to this website or it does not exist' }]
      });
    }

    res.status(200).json({
      success: true,
      website
    });

  } catch (error) {
    handleError(error, res, 'getWebsiteById');
  }
};

export const updateWebsite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    const allowedUpdates = [
      'name', 
      'checkInterval', 
      'responseThreshold', 
      'alertEnabled', 
      'region', 
      'isPaused',
      'method',
      'headers',
      'body',
      'expectedStatus',
      'timeout',
      'responseValidationType',
      'responseValidationValue'
    ];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => ({ ...obj, [key]: updates[key] }), {});

    const website = await Website.findOneAndUpdate(
      { _id: id, userId },
      filteredUpdates,
      { new: true }
    );

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Website updated successfully',
      website
    });

  } catch (error) {
    console.error('[WEBSITE]', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update website'
    });
  }
};

export const deleteWebsite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const website = await Website.findOneAndDelete({ _id: id, userId });

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found',
        errors: [{ field: 'id', message: 'You do not have access to this website or it does not exist' }]
      });
    }

    await Log.deleteMany({ websiteId: id });
    await Incident.deleteMany({ websiteId: id });

    res.status(200).json({
      success: true,
      message: 'Website deleted successfully',
      deletedWebsite: {
        id: website._id,
        url: website.url
      }
    });

  } catch (error) {
    handleError(error, res, 'deleteWebsite');
  }
};

export const triggerCheck = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const website = await Website.findOne({ _id: id, userId });

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found'
      });
    }

    const result = await checkSingleWebsite(website);

    res.status(200).json({
      success: true,
      message: 'Check triggered successfully',
      result
    });

  } catch (error) {
    console.error('[MONITOR]', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger check'
    });
  }
};

export const getWebsiteLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const website = await Website.findOne({ _id: id, userId }).lean();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found',
        errors: [{ field: 'id', message: 'You do not have access to this website or it does not exist' }]
      });
    }

    const query = { websiteId: id };
    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }
    if (req.query.startDate || req.query.endDate) {
      query.checkedAt = {};
      if (req.query.startDate) query.checkedAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.checkedAt.$lte = new Date(req.query.endDate);
    }

    const [logs, total] = await Promise.all([
      Log.find(query)
        .sort({ checkedAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      Log.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });

  } catch (error) {
    handleError(error, res, 'getWebsiteLogs');
  }
};

export const getWebsiteAnalyticsController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const period = parseInt(req.query.period) || 24;

    const website = await Website.findOne({ _id: id, userId }).lean();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found',
        errors: [{ field: 'id', message: 'You do not have access to this website or it does not exist' }]
      });
    }

    const analytics = await getWebsiteAnalytics(id, { period });

    res.status(200).json({
      success: true,
      analytics
    });

  } catch (error) {
    handleError(error, res, 'getWebsiteAnalyticsController');
  }
};

export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [overview, recentWebsites] = await Promise.all([
      getAllWebsitesOverview(userId),
      Website.find({ userId })
        .sort({ lastCheckedAt: -1 })
        .limit(5)
        .select('name url status lastCheckedAt')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      summary: overview.summary,
      recentWebsites
    });

  } catch (error) {
    console.error('[WEBSITE]', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary'
    });
  }
};

export const getIncidents = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const days = Math.min(parseInt(req.query.days) || 7, 365);

    const website = await Website.findOne({ _id: id, userId }).lean();

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found',
        errors: [{ field: 'id', message: 'You do not have access to this website or it does not exist' }]
      });
    }

    const incidents = await getDowntimeIncidents(id, days);

    res.status(200).json({
      success: true,
      incidents,
      meta: {
        days,
        count: incidents.length
      }
    });

  } catch (error) {
    handleError(error, res, 'getIncidents');
  }
};

export const getAllIncidents = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const incidents = await getAllUserIncidents(userId, limit);

    res.status(200).json({
      success: true,
      incidents,
      count: incidents.length
    });

  } catch (error) {
    handleError(error, res, 'getAllIncidents');
  }
};
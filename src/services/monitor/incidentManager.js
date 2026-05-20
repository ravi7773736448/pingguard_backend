import Incident from '../../models/incident.model.js';
import { HTTP_STATUS } from '../../config/constants/index.js';

export const getOrStartOutage = async (monitor, checkResult) => {
  // Look up if there's already an active (unresolved) incident
  let activeIncident = await Incident.findOne({
    websiteId: monitor._id,
    endTime: null
  });

  const isNewOutage = !activeIncident && checkResult.status === HTTP_STATUS.DOWN;

  if (isNewOutage) {
    activeIncident = await Incident.create({
      websiteId: monitor._id,
      websiteName: monitor.name || monitor.url,
      startTime: new Date(),
      endTime: null,
      errorType: checkResult.errorType,
      aiSummary: null
    });
    console.log(`🔴 Outage registered for: ${monitor.name || monitor.url}`);
  }

  return { activeIncident, isNewOutage };
};

export const resolveOutage = async (monitor, checkResult) => {
  const activeIncident = await Incident.findOne({
    websiteId: monitor._id,
    endTime: null
  });

  if (!activeIncident) return null;

  const endTime = new Date();
  const duration = endTime.getTime() - activeIncident.startTime.getTime();

  activeIncident.endTime = endTime;
  activeIncident.duration = duration;
  activeIncident.errorType = checkResult.errorType || 'Recovered';
  await activeIncident.save();

  console.log(`✅ Outage resolved for: ${monitor.name || monitor.url} | Duration: ${Math.round(duration/60000)} min`);
  return activeIncident;
};

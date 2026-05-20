import { generateIncidentSummary as getLlmSummary } from '../ai-summary.service.js';

export const queueAISummary = (incident, website) => {
  // Defer execution using setImmediate to guarantee it runs asynchronously in the next phase
  // and absolutely never blocks the primary monitoring loop thread.
  setImmediate(async () => {
    try {
      const summary = await getLlmSummary({
        websiteName: website.name || website.url,
        duration: incident.duration,
        errorType: incident.errorType
      });

      incident.aiSummary = summary;
      await incident.save();
      console.log(`🤖 AI summary attached to incident ${incident._id}`);
    } catch (err) {
      console.error(`[AI] Background generation failed: ${err.message}`);
    }
  });
};

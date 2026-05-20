import { sendEmail } from '../email.service.js';

export const sendAlertNotification = async (email, monitor, checkResult, activeIncident, type) => {
  if (!email || !monitor.alertEnabled) return;

  const isDown = type === 'DOWN';
  const subject = isDown 
    ? `🔴 Outage Detected: ${monitor.name || monitor.url}` 
    : `✅ Recovered: ${monitor.name || monitor.url}`;

  const bodyText = isDown
    ? `Your monitor ${monitor.name} (${monitor.url}) is DOWN.\nError: ${checkResult.errorType}\nStatus Code: ${checkResult.statusCode}`
    : `Your monitor ${monitor.name} (${monitor.url}) recovered.\nDowntime Duration: ${Math.round(activeIncident.duration / 60000)} minutes.`;

  const htmlContent = isDown 
    ? getDownEmailHtml(monitor, checkResult) 
    : getUpEmailHtml(monitor, activeIncident);

  try {
    await sendEmail(email, subject, bodyText, htmlContent);
  } catch (error) {
    console.error(`[ALERT] Failed to send email to ${email}: ${error.message}`);
  }
};

const getDownEmailHtml = (monitor, checkResult) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔴 Website Down Alert</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">We've detected that your monitor is not responding.</p>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
          <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Website:</strong> <span style="color: #dc2626;">${monitor.name || monitor.url}</span></p>
          <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">URL:</strong> <a href="${monitor.url}" style="color: #dc2626;">${monitor.url}</a></p>
          <p style="margin: 0;"><strong style="color: #111827;">Status:</strong> <span style="color: #dc2626; font-weight: bold;">Down</span></p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #111827; font-size: 16px; margin-bottom: 10px;">📊 Error Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Error Type</td>
              <td style="padding: 8px; color: #dc2626; font-weight: bold; border-bottom: 1px solid #f3f4f6;">${checkResult.errorType}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Status Code</td>
              <td style="padding: 8px; color: #111827; font-weight: bold; border-bottom: 1px solid #f3f4f6;">${checkResult.statusCode || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Response Time</td>
              <td style="padding: 8px; color: #111827; font-weight: bold; border-bottom: 1px solid #f3f4f6;">${checkResult.responseTime}ms</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">We'll notify you automatically once your monitor is back online.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">This is an automated message from <strong>PingGuard</strong> - Your Website Monitoring Partner</p>
      </div>
    </div>
  `;
};

const getUpEmailHtml = (monitor, incident) => {
  const durationMinutes = Math.round(incident.duration / 60000);
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Website Recovered</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Good news! Your monitor is back online and operational.</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Website:</strong> <span style="color: #059669;">${monitor.name || monitor.url}</span></p>
          <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">URL:</strong> <a href="${monitor.url}" style="color: #059669;">${monitor.url}</a></p>
          <p style="margin: 0;"><strong style="color: #111827;">Status:</strong> <span style="color: #10b981; font-weight: bold;">Operational</span></p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #111827; font-size: 16px; margin-bottom: 10px;">📊 Outage Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Downtime Duration</td>
              <td style="padding: 8px; color: #111827; font-weight: bold; border-bottom: 1px solid #f3f4f6;">${durationMinutes} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Error Trigger</td>
              <td style="padding: 8px; color: #dc2626; font-weight: bold; border-bottom: 1px solid #f3f4f6;">${incident.errorType || 'Unknown'}</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">AI is currently processing detailed diagnostic incident summaries which will appear inside your logs tab shortly.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">This is an automated message from <strong>PingGuard</strong> - Your Website Monitoring Partner</p>
      </div>
    </div>
  `;
};

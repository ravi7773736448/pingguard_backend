import { Resend } from 'resend';
import { Config } from '../config/config.js';

let resendClient;

const initResend = () => {
  if (Config.RESEND_API_KEY) {
    console.log('[EMAIL] Using Resend service');
    return new Resend(Config.RESEND_API_KEY);
  }
  
  console.log('[EMAIL] No email configuration found');
  return null;
};

resendClient = initResend();

const APP_NAME = 'PingGuard';

const sendEmail = async (to, subject, text, html) => {
  if (!resendClient) {
    console.log('[EMAIL] Skipped - no transporter configured');
    return;
  }
  
  try {
    const { data, error } = await resendClient.emails.send({
      from: `${APP_NAME} <onboarding@resend.dev>`,
      to: [to],
      subject,
      text,
      html
    });

    if (error) {
      console.error('[EMAIL] Send failed:', error.message);
      return;
    }

    console.log('[EMAIL] Sent:', data?.id);
  } catch (error) {
    console.error('[EMAIL] Send failed:', error.message);
  }
};

export { sendEmail };
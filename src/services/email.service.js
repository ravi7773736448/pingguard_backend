import nodemailer from 'nodemailer';
import { Config } from '../config/config.js';

// Create transporter - try Resend first, fallback to Gmail SMTP
let transporter;

const initTransporter = () => {
  // Option 1: Use Resend (recommended for production)
  if (Config.RESEND_API_KEY) {
    console.log('[EMAIL] Using Resend service');
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: Config.RESEND_API_KEY
      }
    });
  }
  
  // Option 2: Fallback to Gmail SMTP
  if (Config.EMAIL_USER && Config.EMAIL_PASS) {
    console.log('[EMAIL] Using Gmail SMTP');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: Config.EMAIL_USER,
        pass: Config.EMAIL_PASS
      }
    });
  }

  // No email config - return null
  console.log('[EMAIL] No email configuration found');
  return null;
};

transporter = initTransporter();

if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('[EMAIL] Connection error:', error.message);
    } else {
      console.log('[EMAIL] Server ready to send messages');
    }
  });
}

const APP_NAME = 'PingGuard';

const sendEmail = async (to, subject, text, html) => {
  if (!transporter) {
    console.log('[EMAIL] Skipped - no transporter configured');
    return;
  }
  
  try {
    const info = await transporter.sendMail({
      from: `${APP_NAME} <${Config.EMAIL_USER || 'noreply@resend.dev'}>`,
      to,
      subject,
      text,
      html
    });
    console.log('[EMAIL] Sent:', info.messageId);
  } catch (error) {
    console.error('[EMAIL] Send failed:', error.message);
  }
};

export { sendEmail };
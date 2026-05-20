import nodemailer from 'nodemailer';
import { Config } from '../config/config.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAUTH2',
    user: Config.EMAIL_USER,
    clientId: Config.CLIENT_ID,
    clientSecret: Config.CLIENT_SECRET,
    refreshToken: Config.REFRESH_TOKEN,
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('[EMAIL] Connection error:', error.message);
  } else {
    console.log('[EMAIL] Server ready to send messages');
  }
});

const APP_NAME = 'PingGuard';

const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `${APP_NAME} <${Config.EMAIL_USER}>`,
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
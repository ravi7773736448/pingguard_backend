import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_NAME = 'PingGuard';

const sendEmail = async (to, subject, text, html) => {
  if (!process.env.RESEND_API_KEY) {
    console.log('[EMAIL] RESEND_API_KEY not configured');
    return;
  }
  
  try {
    console.log('[EMAIL] Sending to:', to);
    
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <onboarding@resend.dev>`,
      to: [to],
      subject,
      text,
      html
    });

    if (error) {
      console.error('[EMAIL] Send failed:', error);
      return;
    }

    console.log('[EMAIL] Sent successfully:', data?.id);
  } catch (error) {
    console.error('[EMAIL] Send failed:', error);
  }
};

export { sendEmail };
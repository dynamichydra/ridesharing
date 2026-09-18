import { env, isSmtpConfigured } from '../config/env.js';

let _transporter = null;
async function getTransporter() {
  if (_transporter) return _transporter;
  const { default: nodemailer } = await import('nodemailer');
  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    secure: parseInt(env.SMTP_PORT, 10) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return _transporter;
}

// Provider-agnostic SMTP sender — works with Gmail, AWS SES SMTP, Mailgun, or any SMTP relay
// by just changing env vars (same "add env vars, feature turns on" convention as
// isRazorpayConfigured/isTwilioConfigured). No real email-sending capability existed anywhere
// in this codebase before this — utils/emailOtp.js's OTP path only ever console.log'd.
export async function sendEmail({ to, subject, html }) {
  if (!isSmtpConfigured) {
    console.log(`[EMAIL DEV] → ${to} | ${subject}\n${html}`);
    return;
  }
  const transporter = await getTransporter();
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

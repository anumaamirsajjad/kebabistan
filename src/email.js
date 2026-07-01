const nodemailer = require('nodemailer');

const getTransportConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass }
  };
};

const getTransporter = () => {
  const config = getTransportConfig();
  if (!config) {
    return null;
  }
  return nodemailer.createTransport(config);
};

const sendEmail = async ({ to, subject, text }) => {
  const from = process.env.SMTP_FROM;
  const transporter = getTransporter();

  if (!from || !transporter) {
    throw new Error('Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
  }

  const info = await transporter.sendMail({ from, to, subject, text });
  return { messageId: info.messageId };
};

module.exports = { sendEmail };
const nodemailer = require('nodemailer');

const hasSmtpConfig = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendGatePassApprovalEmail = async ({ recipients, gatePass }) => {
  if (!recipients || recipients.length === 0) {
    return { sent: false, reason: 'No recipients available' };
  }

  if (!hasSmtpConfig()) {
    console.warn('SMTP configuration missing, skipping gate pass email notification.');
    return { sent: false, reason: 'SMTP not configured' };
  }

  const transporter = createTransporter();

  const subject = `Gate Pass Approval Required - ${gatePass.vehicle.number}`;
  const body = [
    'A new gate pass request requires approval.',
    '',
    `Vehicle No: ${gatePass.vehicle.number}`,
    `Driver Name: ${gatePass.vehicle.driverName}`,
    `Driver Contact: ${gatePass.vehicle.driverContact}`,
    `Purpose: ${gatePass.purpose}`,
    `Requested At: ${new Date(gatePass.createdAt).toLocaleString()}`,
  ].join('\n');

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipients.join(','),
    subject,
    text: body,
  });

  return { sent: true };
};

module.exports = {
  sendGatePassApprovalEmail,
};

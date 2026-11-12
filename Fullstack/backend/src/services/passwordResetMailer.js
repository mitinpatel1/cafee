'use strict';

const nodemailer = require('nodemailer');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function getTransporter() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (!host || !Number.isInteger(port) || port <= 0 || !user || !pass) {
    const error = new Error('Email service is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS to backend/.env.');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || (port === 465)).toLowerCase() === 'true',
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

async function sendPasswordResetOtp({ to, name, portal, otp, expiresMinutes = 10 }) {
  const transporter = getTransporter();
  const from = String(process.env.SMTP_FROM || '').trim() || `OfficeBite Security <${process.env.SMTP_USER}>`;
  const safeName = escapeHtml(name || 'there');
  const portalLabel = portal === 'admin' ? 'Admin' : 'Franchise';

  await transporter.sendMail({
    from,
    to,
    subject: 'Your OfficeBite password reset code',
    text: `Hello ${name || 'there'},\n\nYour ${portalLabel} password reset code is ${otp}. It expires in ${expiresMinutes} minutes. If you did not request this, you can ignore this email.\n\nOfficeBite Security`,
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f5f1;font-family:Arial,sans-serif;color:#241f1a"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #eee5da;border-radius:16px;padding:30px"><div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#9b1c40">OFFICEBITE</div><h2 style="margin:18px 0 8px">Password reset</h2><p>Hello ${safeName},</p><p>Use this one-time code to reset your ${portalLabel.toLowerCase()} password:</p><div style="margin:24px 0;padding:18px;text-align:center;background:#fff4ef;border-radius:12px;font-size:32px;font-weight:800;letter-spacing:9px;color:#8d1739">${otp}</div><p>This code expires in <strong>${expiresMinutes} minutes</strong>. You have a limited number of attempts.</p><p style="font-size:13px;color:#756d65">If you did not request this reset, you can safely ignore this email. Your password will not change.</p><hr style="border:0;border-top:1px solid #eee5da;margin:24px 0"><p style="font-size:12px;color:#8a8178">OfficeBite Security</p></div></body></html>`,
  });
}

module.exports = { sendPasswordResetOtp };

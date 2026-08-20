import nodemailer from 'nodemailer';
import { createHash, randomInt } from 'crypto';
import { prisma } from '@e-ams/db';
import type { EmailOtpPurpose } from '@e-ams/db';
import { ApiError } from '../middleware/errorHandler';

const OTP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const OTP_LENGTH = 5;
const OTP_TTL_MS = 10 * 60 * 1000;
const BRAND = 'e-AMS';

function smtpPass() {
  return (process.env.SMTP_PASS || '').replace(/\s+/g, '');
}

function transporter() {
  const user = process.env.SMTP_USER;
  const pass = smtpPass();
  if (!user || !pass) throw new ApiError(500, 'Email is not configured');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user, pass },
  });
}

function hashOtp(email: string, purpose: EmailOtpPurpose, code: string) {
  return createHash('sha256').update(`${email.toLowerCase()}:${purpose}:${code}`).digest('hex');
}

function generateOtp() {
  let code = '';
  for (let i = 0; i < OTP_LENGTH; i++) code += OTP_ALPHABET[randomInt(OTP_ALPHABET.length)];
  return code;
}

function brandedHtml(title: string, intro: string, code: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1b1b">
    <p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#0051c6;margin:0 0 8px">${BRAND}</p>
    <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
    <p style="line-height:1.5;color:#424655">${intro}</p>
    <p style="font-size:28px;letter-spacing:.35em;font-weight:700;background:#f6f3f2;padding:16px 20px;text-align:center;border-radius:8px">${code}</p>
    <p style="font-size:13px;color:#727787">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
  </div>`;
}

export async function sendMail(to: string, subject: string, html: string) {
  const from = process.env.SMTP_FROM || `${BRAND} <${process.env.SMTP_USER}>`;
  await transporter().sendMail({ from, to, subject, html });
}

export async function issueEmailOtp(email: string, purpose: EmailOtpPurpose) {
  const normalized = email.trim().toLowerCase();
  const recent = await prisma.emailOtp.findFirst({
    where: { email: normalized, purpose, createdAt: { gt: new Date(Date.now() - 60_000) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recent && !recent.consumedAt) {
    throw new ApiError(429, 'Please wait a minute before requesting another code');
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.emailOtp.updateMany({
    where: { email: normalized, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.emailOtp.create({
    data: {
      email: normalized,
      purpose,
      codeHash: hashOtp(normalized, purpose, code),
      expiresAt,
    },
  });

  const isVerify = purpose === 'VERIFY_EMAIL';
  const subject = isVerify ? `Your ${BRAND} verification code` : `Your ${BRAND} password reset code`;
  const intro = isVerify
    ? `Use this 5-character code to verify your ${BRAND} email address.`
    : `Use this 5-character code to reset your ${BRAND} password.`;
  await sendMail(normalized, subject, brandedHtml(isVerify ? 'Verify your email' : 'Reset your password', intro, code));
}

export async function consumeEmailOtp(email: string, purpose: EmailOtpPurpose, code: string) {
  const normalized = email.trim().toLowerCase();
  const otp = await prisma.emailOtp.findFirst({
    where: { email: normalized, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp || otp.expiresAt < new Date()) throw new ApiError(400, 'Invalid or expired code');
  if (otp.codeHash !== hashOtp(normalized, purpose, code.trim().toUpperCase())) {
    throw new ApiError(400, 'Invalid or expired code');
  }
  await prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}

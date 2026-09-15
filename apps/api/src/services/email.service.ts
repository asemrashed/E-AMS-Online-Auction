import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
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

function smtpPorts(): number[] {
  const configured = Number(process.env.SMTP_PORT || (process.env.RENDER ? 465 : 587));
  const other = configured === 465 ? 587 : 465;
  // Render often cannot complete STARTTLS on 587; prefer 465 first when hosted there.
  if (process.env.RENDER && configured === 587) return [465, 587];
  return process.env.SMTP_NO_FALLBACK === 'true' ? [configured] : [configured, other];
}

export function describeSmtp() {
  const user = process.env.SMTP_USER || '';
  const ports = smtpPorts();
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: ports[0],
    fallbackPort: ports[1] ?? null,
    userSet: Boolean(user),
    passSet: Boolean(smtpPass()),
    from: process.env.SMTP_FROM || (user ? `${BRAND} <${user}>` : null),
  };
}

function smtpOptions(port: number): SMTPTransport.Options {
  const user = process.env.SMTP_USER;
  const pass = smtpPass();
  if (!user || !pass) throw new ApiError(500, 'Email is not configured');
  const secure = port === 465;
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    family: 4,
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
    tls: { minVersion: 'TLSv1.2' },
  } as SMTPTransport.Options;
}

function isConnFailure(err: unknown) {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : '';
  return ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'].includes(code);
}

function smtpError(err: unknown) {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : '';
  console.error('[smtp] send failed', { code, message: err instanceof Error ? err.message : err });
  if (isConnFailure(err)) {
    return new ApiError(
      503,
      'Could not reach the mail server. If this is hosted on Render, set SMTP_PORT=465 (SSL). Gmail also requires an App Password.',
    );
  }
  return new ApiError(503, 'Could not send email right now. Please try again shortly.');
}

function transporter(port = smtpPorts()[0]) {
  return nodemailer.createTransport(smtpOptions(port));
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
  const ports = smtpPorts();
  const payload = { from, to, subject, html };
  let lastErr: unknown;

  for (let i = 0; i < ports.length; i++) {
    try {
      await transporter(ports[i]).sendMail(payload);
      if (i > 0) console.warn(`[smtp] sent via fallback port ${ports[i]}`);
      return;
    } catch (err) {
      lastErr = err;
      if (!isConnFailure(err) || i === ports.length - 1) throw smtpError(err);
      console.warn(`[smtp] port ${ports[i]} failed (${(err as { code?: string }).code}); retrying ${ports[i + 1]}`);
    }
  }

  throw smtpError(lastErr);
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
  const record = await prisma.emailOtp.create({
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
  try {
    await sendMail(normalized, subject, brandedHtml(isVerify ? 'Verify your email' : 'Reset your password', intro, code));
  } catch (err) {
    await prisma.emailOtp.delete({ where: { id: record.id } }).catch(() => undefined);
    throw err;
  }
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

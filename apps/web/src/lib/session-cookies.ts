const AUTH = 'eams_auth';
const ROLE = 'eams_role';

export function setSessionCookies(role: string) {
  document.cookie = `${AUTH}=1; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  document.cookie = `${ROLE}=${role}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearSessionCookies() {
  document.cookie = `${AUTH}=; Path=/; Max-Age=0`;
  document.cookie = `${ROLE}=; Path=/; Max-Age=0`;
}
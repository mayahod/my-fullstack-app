export function publicAppUrl() {
  const value = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || process.env.CLIENT_URL;
  if (!value) throw new Error('APP_URL is not configured');
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
    throw new Error('APP_URL must be a valid HTTPS origin in production');
  }
  return url.origin;
}

export function mailConfigured() {
  try { publicAppUrl(); return !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM); }
  catch { return false; }
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!mailConfigured()) throw new Error('Password reset mail is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [to],
      subject: 'איפוס סיסמה — ספר המתכונים שלנו',
      text: `לבחירת סיסמה חדשה פתחו את הקישור הבא:\n${resetUrl}\n\nהקישור תקף ל־30 דקות ולשימוש אחד בלבד. אם לא ביקשתם לאפס סיסמה, אפשר להתעלם מההודעה.`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Mail provider rejected delivery (${response.status})`);
  const result = await response.json();
  if (!result.id) throw new Error('Mail provider did not confirm message acceptance');
}

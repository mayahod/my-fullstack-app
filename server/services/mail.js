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
  try { publicAppUrl(); return !!((process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) && process.env.MAIL_FROM); }
  catch { return false; }
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!mailConfigured()) throw new Error('Password reset mail is not configured');
  const brevo = !!process.env.BREVO_API_KEY;
  const subject = 'איפוס סיסמה — ספר המתכונים שלנו';
  const text = `לבחירת סיסמה חדשה פתחו את הקישור הבא:\n${resetUrl}\n\nהקישור תקף ל־30 דקות ולשימוש אחד בלבד. אם לא ביקשתם לאפס סיסמה, אפשר להתעלם מההודעה.`;
  const match = process.env.MAIL_FROM.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  const sender = match ? { name: match[1].trim(), email: match[2].trim() } : { name: 'ספר המתכונים שלנו', email: process.env.MAIL_FROM.trim() };
  const safeUrl = resetUrl.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const response = await fetch(brevo ? 'https://api.brevo.com/v3/smtp/email' : 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { ...(brevo ? { 'api-key': process.env.BREVO_API_KEY } : { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }), 'Content-Type': 'application/json' },
    body: JSON.stringify(brevo ? {
      sender, to: [{ email: to }], subject, textContent: text,
      htmlContent: `<html lang="he" dir="rtl"><body><h1>איפוס סיסמה</h1><p><a href="${safeUrl}">לבחירת סיסמה חדשה</a></p><p>הקישור תקף ל־30 דקות ולשימוש אחד בלבד. אם לא ביקשתם איפוס, אפשר להתעלם מההודעה.</p></body></html>`,
    } : {
      from: process.env.MAIL_FROM,
      to: [to],
      subject, text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Mail provider rejected delivery (${response.status})`);
  const result = await response.json();
  if (!(brevo ? result.messageId : result.id)) throw new Error('Mail provider did not confirm message acceptance');
}

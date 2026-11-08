import express from 'express';
import { rateLimit } from '../rateLimit.js';

const router = express.Router();
const model = 'gemini-3.1-flash-lite';
const instructions = [
  'את עוזרת בישול באתר מתכונים בעברית. עני בעברית ברורה וקצרה ובטקסט פשוט.',
  'הציעי מנה אחת שניתן להכין מהמצרכים שצוינו. צייני זמן כולל משוער וכמה שלבי הכנה מעשיים.',
  'אם צריך מצרך נוסף, אמרי זאת במפורש והציעי תחליף כשאפשר. אל תניחי שהמצרך נמצא בבית.',
  'בשאלת המשך התאימי את ההצעה להקשר. בקשי הבהרה אם אין מספיק מידע. התייחסי רק לבישול.',
  'אל תציעי שימוש במזון מקולקל או אכילת בשר, דגים או ביצים שאינם מבושלים כנדרש.',
].join(' ');

function readConversation(messages) {
  if (
    !Array.isArray(messages) ||
    !messages.length ||
    messages.length > 9 ||
    messages.length % 2 === 0
  ) {
    return null;
  }
  const contents = [];
  for (const [index, message] of messages.entries()) {
    const role = index % 2 === 0 ? 'user' : 'assistant';
    const text = typeof message?.text === 'string' ? message.text.trim() : '';
    if (message?.role !== role || !text || text.length > (role === 'user' ? 600 : 3000)) {
      return null;
    }
    contents.push({ role: role === 'assistant' ? 'model' : 'user', parts: [{ text }] });
  }
  return contents;
}

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.get('/status', (req, res) =>
  res.json({ available: Boolean(process.env.GEMINI_API_KEY?.trim()) })
);

const limitVisitor = rateLimit({ limit: 6, windowMs: 10 * 60_000 });
const limitTotal = rateLimit({ limit: 40, windowMs: 60 * 60_000, keyFor: () => 'pantry' });

router.post(
  '/chat',
  (req, res, next) => {
    if (!process.env.GEMINI_API_KEY?.trim()) {
      return res
        .status(503)
        .json({ message: 'הצ׳אט החי עדיין לא זמין. אפשר לנסות את שיחת הדוגמה.' });
    }
    next();
  },
  limitVisitor,
  limitTotal,
  async (req, res) => {
    const contents = readConversation(req.body?.messages);
    if (!contents)
      return res.status(400).json({ message: 'ההודעה או השיחה ארוכות מדי או לא תקינות' });

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY.trim(),
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: instructions }] },
            contents,
            generationConfig: {
              maxOutputTokens: 700,
              thinkingConfig: { thinkingLevel: 'MINIMAL' },
            },
          }),
          signal: AbortSignal.timeout(22_000),
        }
      );
      if (!response.ok) {
        console.warn('Pantry model request failed', response.status);
        return res
          .status(503)
          .json({ message: 'עוזר הבישול לא זמין כרגע. נסו שוב בעוד כמה דקות.' });
      }
      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const answer = parts
        .filter((part) => !part.thought && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n')
        .trim();
      if (answer) return res.json({ answer: answer.slice(0, 3000) });
    } catch (error) {
      console.warn('Pantry model request failed', error.name);
    }
    return res.status(502).json({ message: 'לא התקבלה הצעה הפעם. נסו לנסח מחדש או לשלוח שוב.' });
  }
);

export default router;

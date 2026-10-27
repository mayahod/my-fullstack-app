// Per-instance limits; use a shared store before scaling to multiple servers.
export function rateLimit({ limit, windowMs = 15 * 60 * 1000 }) {
  const entries = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    for (const [ip, entry] of entries) if (entry.until <= now) entries.delete(ip);
    let entry = entries.get(key);
    if (!entry) {
      if (entries.size >= 10000)
        return res.status(429).json({ message: 'נא לנסות שוב מאוחר יותר' });
      entry = { count: 0, until: now + windowMs };
      entries.set(key, entry);
    }
    if (++entry.count > limit) {
      res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      return res
        .status(429)
        .json({ message: 'בוצעו יותר מדי ניסיונות. נא לנסות שוב בעוד מספר דקות.' });
    }
    next();
  };
}

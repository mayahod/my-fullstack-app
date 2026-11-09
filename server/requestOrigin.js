const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireTrustedOrigin(origins) {
  const trusted = new Set(origins.filter(Boolean).map((url) => new URL(url).origin));
  return (req, res, next) => {
    if (safeMethods.has(req.method) || trusted.has(req.get('Origin'))) return next();
    return res.status(403).json({ message: 'לא ניתן לבצע את הפעולה מחוץ לאתר' });
  };
}

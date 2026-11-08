const units = {
  גרם: ['גרם', 1],
  גרמים: ['גרם', 1],
  'ג׳': ['גרם', 1],
  קילו: ['גרם', 1000],
  קילוגרם: ['גרם', 1000],
  'ק״ג': ['גרם', 1000],
  'מ״ל': ['מ״ל', 1],
  מיליליטר: ['מ״ל', 1],
  ליטר: ['מ״ל', 1000],
  כוס: ['כוס', 1],
  כוסות: ['כוס', 1],
  כף: ['כף', 1],
  כפות: ['כף', 1],
  כפית: ['כפית', 1],
  כפיות: ['כפית', 1],
  יחידה: ['יח׳', 1],
  יחידות: ['יח׳', 1],
};
const plurals = { כוס: 'כוסות', כף: 'כפות', כפית: 'כפיות' };

function quantity(value) {
  return value.split(' ').reduce((sum, part) => {
    const [number, denominator] = part.split('/').map(Number);
    return sum + (denominator === undefined ? number : number / denominator);
  }, 0);
}

export function shoppingList(recipes) {
  const entries = new Map();
  const plain = new Set();
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const line = ingredient.trim().replace(/\s+/g, ' ');
      if (!line) continue;
      const match = /^(\d+(?:\.\d+|\/\d+| \d+\/\d+)?) (\S+)(?: (.+))?$/.exec(line);
      const amount = match && quantity(match[1]);
      if (!Number.isFinite(amount) || amount <= 0) {
        plain.add(line);
        continue;
      }
      const [, , first, rest] = match;
      const unitInfo = rest && Object.hasOwn(units, first) ? units[first] : null;
      const [unit, factor] = unitInfo ?? ['', 1];
      const name = unitInfo ? rest : [first, rest].filter(Boolean).join(' ');
      const key = unit + ':' + name.toLowerCase();
      const previous = entries.get(key);
      entries.set(key, { name, unit, amount: (previous?.amount ?? 0) + amount * factor });
    }
  }
  return [
    ...Array.from(entries.values(), ({ amount, unit, name }) =>
      [Number(amount.toFixed(3)), amount > 1 ? plurals[unit] || unit : unit, name]
        .filter(Boolean)
        .join(' ')
    ),
    ...plain,
  ];
}

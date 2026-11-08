const aliases = {
  עגבניה: 'עגבניות',
  עגבנייה: 'עגבניות',
  מלפפונים: 'מלפפון',
  ביצים: 'ביצה',
  לימונים: 'לימון',
  בצלים: 'בצל',
  גזרים: 'גזר',
  שן: '',
  שיני: '',
};

const description = new Set(
  'גרם קילו מ״ל מל כוס כוסות כף כפות כפית כפיות חצי וחצי רבע חופן קורט קצוץ קצוצה קצוצים קצוצות שטופות מרוסקות מרוסק פושרים קטן קטנה לבצק לתבנית ולציפוי לפי הטעם עלי'.split(
    ' '
  )
);

function ingredientKey(value) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '')
    .replace(/[\p{N}]+|[^\p{L}\s״]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => !description.has(word))
    .map((word) => (Object.hasOwn(aliases, word) ? aliases[word] : word))
    .filter(Boolean)
    .join(' ');
}

export function matchRecipes(recipes, inventory) {
  const available = new Set(
    inventory
      .split(/[,;\n]+/)
      .map(ingredientKey)
      .filter(Boolean)
  );
  if (!available.size) return [];

  return recipes
    .filter((recipe) => recipe.ingredients?.length)
    .map((recipe) => {
      const missing = recipe.ingredients.filter(
        (ingredient) => !available.has(ingredientKey(ingredient))
      );
      const matched = recipe.ingredients.length - missing.length;
      return { recipe, missing, matched, coverage: matched / recipe.ingredients.length };
    })
    .filter(({ matched }) => matched > 0)
    .sort(
      (a, b) =>
        b.coverage - a.coverage ||
        (a.recipe.totalMinutes ?? Infinity) - (b.recipe.totalMinutes ?? Infinity)
    );
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRecipes } from './pantry.js';

test('pantry results match whole ingredient names, expose missing items and rank by time', () => {
  const slow = { title: 'slow', ingredients: ['2 מלפפונים', '3 עגבניות'], totalMinutes: 25 };
  const fast = { title: 'fast', ingredients: ['מלפפון קצוץ', 'עגבניות'], totalMinutes: 10 };
  const partial = { title: 'partial', ingredients: ['מלפפון', 'כף שמן זית'], totalMinutes: 5 };
  const unrelated = { title: 'unrelated', ingredients: ['כף רסק עגבניות'] };
  const recipes = [slow, partial, unrelated, fast];
  const matches = matchRecipes(recipes, 'מלפפון; עגבנייה\nשמן');
  assert.deepEqual(
    matches.map(({ recipe }) => recipe.title),
    ['fast', 'slow', 'partial']
  );
  assert.deepEqual(matches[0].missing, []);
  assert.deepEqual(matches[2].missing, ['כף שמן זית']);
  assert.deepEqual(matchRecipes(recipes, ' , ; '), []);
});

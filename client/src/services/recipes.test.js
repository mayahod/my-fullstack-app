import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shoppingList } from '../pages/Library/shoppingList.js';

test('shopping list combines compatible quantities and preserves unparsed ingredients', () => {
  const items = shoppingList([
    { ingredients: ['1/2 קילו עגבניות', '1 כף שמן זית', 'מלח לפי הטעם'] },
    { ingredients: ['250 גרם עגבניות', '2 כפות שמן זית', '1 כוס עגבניות'] },
  ]);
  assert.deepEqual(items, ['750 גרם עגבניות', '3 כפות שמן זית', '1 כוס עגבניות', 'מלח לפי הטעם']);
});

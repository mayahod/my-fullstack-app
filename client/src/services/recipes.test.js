import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRecipes, getCachedRecipe, updateMyRecipe } from './recipes.js';

test('recipe navigation shares requests, invalidates after edits, and retries failed loads', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let fail = false;
  globalThis.fetch = async () => {
    calls++;
    if (fail) return { ok: false };
    return { ok: true, json: async () => ({ recipes: [{ _id: 'one', title: 'Pancakes' }] }) };
  };
  try {
    const [first, second] = await Promise.all([fetchRecipes(), fetchRecipes()]);
    assert.equal(calls, 1);
    assert.deepEqual(first, second);
    assert.equal(getCachedRecipe('one').title, 'Pancakes');
    await fetchRecipes();
    assert.equal(calls, 1);
    await updateMyRecipe('one', { title: 'Updated' }, 'test-token');
    assert.equal(getCachedRecipe('one'), null);
    fail = true;
    await assert.rejects(fetchRecipes());
    fail = false;
    assert.equal((await fetchRecipes()).length, 1);
    assert.equal(calls, 4);
  } finally { globalThis.fetch = originalFetch; }
});

import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test('a visitor can create, edit and save a recipe in the demo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: 'התנסות בלי הרשמה' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await page.getByLabel('שם המתכון', { exact: true }).fill('מרק עגבניות ביתי');
  await page.getByLabel('מצרכים', { exact: true }).fill('400 גרם עגבניות');
  await page.getByLabel('שלבי הכנה').fill('מבשלים וטוחנים.');
  await page.getByRole('button', { name: 'שמירה בהדגמה' }).click();
  await page
    .getByRole('article')
    .filter({ hasText: 'מרק עגבניות ביתי' })
    .getByRole('button', { name: 'עריכה' })
    .click();
  await page.getByLabel('שם המתכון', { exact: true }).fill('מרק עגבניות מהיר');
  await page.getByRole('button', { name: 'שמירה בהדגמה' }).click();
  await page
    .getByRole('article')
    .filter({ hasText: 'מרק עגבניות מהיר' })
    .getByRole('button', { name: 'שמירה למועדפים' })
    .click();
  await page.getByRole('button', { name: 'הצגת מועדפים' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'מרק עגבניות מהיר' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'מרק עגבניות מהיר' })).toHaveCount(0);
});

test('a signed-in visitor can find, save and plan a recipe', async ({ page, request }) => {
  const marker = randomUUID().slice(0, 8);
  const credentials = {
    email: 'e2e-' + marker + '@example.test',
    password: 'test-password-' + marker,
  };
  await expect(
    await request.post('/api/users/register', {
      data: { ...credentials, firstName: 'משתמשת בדיקה' },
    })
  ).toBeOK();
  const auth = await request.post('/api/users/login', { data: credentials });
  await expect(auth).toBeOK();
  const { token } = await auth.json();
  const title = 'מרק לבדיקה ' + marker;
  const result = await request.post('/api/recipes', {
    headers: { Authorization: 'Bearer ' + token },
    data: {
      title,
      category: 'מרק',
      totalMinutes: 20,
      difficulty: 'easy',
      isPublic: true,
      ingredients: ['500 גרם עגבניות'],
      steps: ['מבשלים.'],
    },
  });
  await expect(result).toBeOK();
  const { recipe } = await result.json();
  try {
    await page.goto('/login');
    await page.getByLabel('אימייל', { exact: true }).fill(credentials.email);
    await page.getByLabel('סיסמה', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: 'התחבר', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'הפיד שלי' })).toBeVisible();
    let resumeSessionCheck;
    const pendingSessionCheck = new Promise((resolve) => {
      resumeSessionCheck = resolve;
    });
    await page.route(
      '**/api/users/me',
      async (route) => {
        await pendingSessionCheck;
        await route.continue();
      },
      { times: 1 }
    );
    try {
      await page.goto('/community');
      await expect(page.getByRole('heading', { name: 'קהילת המתכונים' })).toBeVisible();
    } finally {
      resumeSessionCheck();
    }
    await expect(page.getByRole('heading', { name: 'הפיד שלי' })).toBeVisible();
    await page.getByRole('link', { name: 'חיפוש מתכונים', exact: true }).click();
    const searchSection = page.getByRole('region', { name: 'חיפוש מתכונים' });
    await page.getByLabel('חיפוש לפי שם או מצרך').fill(marker);
    await expect(page.getByLabel('סינון לפי קטגוריה')).toBeVisible();
    await expect(page.getByLabel('מיון לפי')).toBeVisible();
    await page.getByLabel('מיון לפי').selectOption('quickest');
    await page.getByLabel('רמת קושי').selectOption('easy');
    await page.getByLabel('זמן מרבי בדקות').fill('30');
    await page.getByRole('button', { name: 'חיפוש', exact: true }).click();
    await expect(page).toHaveURL(/sort=quickest/);
    await searchSection.getByRole('link', { name: new RegExp(title) }).click();
    await page.getByRole('button', { name: 'שמירת מתכון', exact: true }).click();
    await expect(page.getByRole('button', { name: 'הסרה מהאוסף', exact: true })).toBeVisible();
    await page.goto('/library');
    await page
      .getByRole('combobox', { name: 'יום ראשון', exact: true })
      .selectOption({ label: title });
    await expect(page.getByText('500 גרם עגבניות', { exact: true })).toBeVisible();
    await page.goto('/pantry');
    await page.getByLabel('מצרכים, מופרדים בפסיקים').fill('עגבניות');
    await page.getByRole('button', { name: 'התאמת מתכונים' }).click();
    await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  } finally {
    await request.delete('/api/recipes/' + recipe._id, {
      headers: { Authorization: 'Bearer ' + token },
    });
  }
});

import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Recipe from './models/Recipe.js';

dotenv.config();
const photos = JSON.parse(await fs.readFile(new URL('../client/public/images/photo-credits.json', import.meta.url), 'utf8'));

// Check every source before changing any recipe.
for (const [name, photo] of Object.entries(photos)) {
  const response = await fetch(photo.imageUrl, { signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`Photo unavailable: ${name} (${response.status})`);
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 1000) throw new Error(`Photo appears empty: ${name}`);
  console.log(`${name}: verified (${bytes.byteLength} bytes)`);
}

try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  let updated = 0;
  for (const [name, photo] of Object.entries(photos)) {
    const result = await Recipe.updateMany(
      { imageUrl: `/images/${name}.svg` },
      { $set: { imageUrl: photo.imageUrl } },
      { runValidators: true },
    );
    updated += result.modifiedCount;
  }
  console.log(JSON.stringify({ updated }));
} finally {
  await mongoose.disconnect();
}

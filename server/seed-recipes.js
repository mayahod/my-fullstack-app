import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Recipe from './models/Recipe.js';
import fs from 'node:fs/promises';

dotenv.config();
const photos = JSON.parse(
  await fs.readFile(new URL('../client/public/images/photo-credits.json', import.meta.url), 'utf8')
);

const recipes = JSON.parse(
  await fs.readFile(new URL('../client/src/data/starterRecipes.json', import.meta.url), 'utf8')
);

try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  let added = 0;
  for (const recipe of recipes) {
    const photoName = recipe.imageUrl.split('/').pop().replace('.svg', '');
    recipe.imageUrl = photos[photoName].imageUrl;
    if (!(await Recipe.exists({ title: recipe.title }))) {
      await Recipe.create({ ...recipe, isPublic: true });
      added++;
    }
  }
  console.log(JSON.stringify({ added, total: await Recipe.countDocuments() }));
} finally {
  await mongoose.disconnect();
}

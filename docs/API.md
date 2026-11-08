# API reference

All routes start with `/api`. Requests with a body use JSON. Protected routes require `Authorization: Bearer <token>`.

## Recipes

| Method | Path               | Authentication                       | Response                             |
| ------ | ------------------ | ------------------------------------ | ------------------------------------ |
| GET    | `/recipes`         | Public                               | `{ recipes: [...] }`                 |
| GET    | `/recipes/catalog` | Public                               | `{ recipes, total, page, pageSize }` |
| GET    | `/recipes/random`  | Public                               | A recipe document, or `null`         |
| GET    | `/recipes/mine`    | Required                             | `{ recipes: [...] }`, newest first   |
| GET    | `/recipes/:id`     | Public recipe or authenticated owner | `{ recipe: {...} }`                  |
| POST   | `/recipes`         | Required                             | `201`, `{ recipe: {...} }`           |
| PATCH  | `/recipes/:id`     | Owner                                | `{ recipe: {...} }`                  |
| DELETE | `/recipes/:id`     | Owner                                | `{ recipe: {...} }`                  |

Editable recipe fields are `title`, `category`, `ingredients`, `steps`, `isPublic`, and optional `imageUrl`, `totalMinutes`, and `difficulty`. Difficulty accepts `easy`, `medium`, or `hard`. New recipes default to `isPublic: false`. Only the owner can read private recipes or change visibility. Legacy documents without `isPublic` remain public. Public list and random endpoints exclude private recipes. Ingredients and steps accept arrays of strings or newline-separated text. The API derives ownership from the session. A missing or foreign-owned recipe returns `404` when editing or deleting.

The catalog accepts `q` (name or ingredient text), `ingredients` (comma-separated), `category`, `difficulty`, `maxMinutes`, `sort`, `page`, and `pageSize`. The page size defaults to 12 and is capped at 24. `sort=match` ranks recipes by how many supplied ingredients appear in the recipe and includes `matchedIngredients` on each result. Other sort modes require every supplied ingredient.

## Saved recipes

All library routes require a bearer token. `GET /library` returns the user's collections and the recipes they can currently access. `PUT /library/collections` creates or returns a collection by name. `DELETE /library/collections/:id` removes a named collection. `PUT` and `DELETE /library/collections/:id/recipes/:recipeId` save or remove one recipe. Use `favorites` for the default collection.

## Community

| Method      | Path                                               | Access                                       |
| ----------- | -------------------------------------------------- | -------------------------------------------- |
| GET         | `/community/discover`                              | Public, with optional session for like state |
| GET         | `/community/people?q=...`, `/community/people/:id` | Public directory and profiles                |
| GET         | `/community/feed`                                  | Signed-in user                               |
| PATCH       | `/community/profile`                               | Signed-in user updating their username       |
| PUT, DELETE | `/community/profile/avatar`                        | Signed-in user updating their photo          |
| PUT, DELETE | `/community/people/:id/follow`                     | Signed-in user adding or removing a follow   |
| GET         | `/community/posts/:id`                             | Public recipe discussion                     |
| PUT, DELETE | `/community/posts/:id/like`                        | Signed-in user adding or removing a like     |
| POST        | `/community/posts/:id/comments`                    | Signed-in user commenting on a public recipe |
| DELETE      | `/community/posts/:id/comments/:commentId`         | Comment author or recipe owner               |

## Pantry assistant

`GET /pantry/status` reports whether the Gemini integration is configured. `POST /pantry/chat` accepts `{ messages: [{ role, text }] }` and returns `{ answer }`. Turns alternate between `user` and `assistant`; the first and last turns must be from the user. The API allows up to nine turns and rate-limits requests.

## Accounts

| Method | Path                     | Body / response                                                   |
| ------ | ------------------------ | ----------------------------------------------------------------- |
| POST   | `/users/register`        | `{ firstName, lastName, email, password }` → `201`, `{ message }` |
| POST   | `/users/login`           | `{ email, password }` → `{ token, user }`                         |
| GET    | `/users/me`              | Bearer token → `{ user }`                                         |
| POST   | `/users/forgot-password` | `{ email }` → generic `{ message }`                               |
| POST   | `/users/reset-password`  | `{ token, password }` → `{ message }`                             |

Email is trimmed and lowercased. Passwords require at least 8 non-padding characters and at most 72 UTF-8 bytes. Public user responses contain identity fields only, without password hashes or reset secrets.

Common status codes: `400` invalid input or reset token; `401` missing/invalid session or wrong login; `409` duplicate registration; `429` rate limit, with `Retry-After`; `503` mail unavailable or delivery rejected. Recipe errors use the legacy `mssg` field in several handlers; account errors use `message`.

## Health

`GET /health` returns `{ ok: true }` with `200` while connected to MongoDB, or `{ ok: false }` with `503` otherwise.

## Compatibility notes

`/recipes/random` returns the document directly, unlike the wrapped single-recipe response. The catalog endpoint returns card fields for paginated browsing; the single-recipe endpoint supplies ingredients and instructions.

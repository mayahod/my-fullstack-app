# API reference

All routes start with `/api`. Requests with a body use JSON. Protected routes require `Authorization: Bearer <token>`.

## Recipes

| Method | Path              | Authentication | Response                           |
| ------ | ----------------- | -------------- | ---------------------------------- |
| GET    | `/recipes`        | Public         | `{ recipes: [...] }`               |
| GET    | `/recipes/random` | Public         | A recipe document, or `null`       |
| GET    | `/recipes/mine`   | Required       | `{ recipes: [...] }`, newest first |
| GET    | `/recipes/:id`    | Public         | `{ recipe: {...} }`                |
| POST   | `/recipes`        | Required       | `201`, `{ recipe: {...} }`         |
| PATCH  | `/recipes/:id`    | Owner          | `{ recipe: {...} }`                |
| DELETE | `/recipes/:id`    | Owner          | `{ recipe: {...} }`                |

Recipe fields: `title`, `category`, optional `imageUrl`, `ingredients`, `steps`, boolean `isPublic`. New recipes default to `isPublic: false`. Only the owner can read private recipes or change visibility. Legacy documents without `isPublic` remain public. Public list and random endpoints exclude private recipes. Ingredients and steps accept arrays of strings or newline-separated text. Ownership comes from the session, never the request body. Edit payloads are restricted to those six fields. A missing or foreign-owned recipe returns `404` when editing or deleting.

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

`/recipes/random` returns the document directly, unlike the wrapped single-recipe response. Search is performed in the client over the public list; there is no `/recipes/search` endpoint. When extending this API, preserve existing response shapes or update their consumers and tests together.

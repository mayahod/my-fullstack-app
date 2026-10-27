# Architecture and maintenance

## Request flow

React Router renders pages inside `App`. Pages call the API through the configured origin. In development, Vite proxies `/api` to Express; in production, Express serves both `/api` and the built React application.

Express routes attach authentication and rate limits before delegating to controllers. Controllers read and write Mongoose models. Mail delivery is isolated in `server/services/mail.js` so the reset flow can be tested without sending email.

## Authentication

Passwords are hashed with bcrypt. Login returns an HS256 JWT that expires after two hours. `AuthContext` stores the token in local storage and verifies it with `/api/users/me` before rendering protected pages. Server authorization is authoritative: client-side routing is only a navigation guard.

Each JWT includes a password version. Resetting a password increments the stored version, invalidating previously issued sessions. Local storage remains accessible to JavaScript; avoid unsafe HTML rendering and review this choice before adding third-party scripts.

Reset tokens contain 32 random bytes. Only their SHA-256 hash is stored, with a 30-minute expiry. The token travels in the URL fragment to keep it out of HTTP access logs and referrers. An atomic database update consumes the token and updates the password, allowing only one successful use. Reset requests return the same success message for unknown accounts and apply a 60-second per-account cooldown.

## Recipe ownership

Public readers can list and open public recipes. New recipes default to private and photos are optional. Only the verified owner can read a private recipe or change its visibility. Legacy documents without a visibility field stay public; lean reads preserve that distinction. Recipe responses use `Cache-Control: no-store`. The server takes `createdBy` from the verified user when creating a recipe. Editing and deleting query by both recipe ID and owner ID; callers cannot assign ownership through the payload. Seed recipes can have no owner and remain publicly readable.

`client/src/services/recipes.js` caches the public list in memory for 30 seconds and shares in-flight list requests. Successful mutations invalidate that cache. Authenticated requests and tokens are never included in the recipe cache. Recipe details are fetched with the current session rather than rendered from the list cache, so access is checked after visibility changes.

## Styling

The document uses Hebrew and RTL layout. Global CSS defines shared controls and typography; page-specific rules belong in CSS Modules. Write punctuation in logical text order rather than reversing strings. Keep narrow-screen overrides after the base rules.

## Configuration and operations

`server/.env` is loaded relative to the server entry point, independent of the shell working directory. Hosting environment variables take precedence. `APP_URL`, then `RENDER_EXTERNAL_URL`, then `CLIENT_URL` determines the public origin used in email links.

Rate limits are stored in process memory. Before running multiple server instances, use a shared rate-limit store. Free hosting can suspend idle processes, so initial requests may be slow. The database is persistent; local server files are not durable hosting storage.

## Verification

`npm run check` covers formatting, lint, unit tests and the client build. `npm run test:integration` additionally covers registration validation, password hashing, login, revoked sessions, recipe ownership, single-use reset tokens, failed email delivery and rate limits against a real MongoDB connection.

GitHub Actions supplies a temporary MongoDB service and test-only credentials. It does not use production secrets or send real emails. For a release, separately verify real mail delivery using an account you control and complete the new-password form yourself.

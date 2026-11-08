# Architecture and maintenance

## Request flow

React Router renders pages inside `App`. The public frontend runs on Netlify and calls the Express API on Render through `VITE_API_URL`. Render can also serve the built React application at its own origin. Locally, Vite proxies `/api` to Express. The static frontend and bundled featured recipes can load while the live API starts up.

Express routes attach authentication and rate limits before delegating to controllers. Controllers read and write Mongoose models. Mail delivery is isolated in `server/services/mail.js` so the reset flow can be tested without sending email.

## Authentication

Passwords are hashed with bcrypt. Login returns an HS256 JWT that expires after two hours. `AuthContext` stores the token in local storage and verifies it with `/api/users/me` before rendering protected pages. Server authorization is authoritative: client-side routing is only a navigation guard.

Each JWT includes a password version. Resetting a password increments the stored version, invalidating previously issued sessions. Local storage remains accessible to JavaScript; avoid unsafe HTML rendering and review this choice before adding third-party scripts.

Reset tokens contain 32 random bytes. Only their SHA-256 hash is stored, with a 30-minute expiry. The token travels in the URL fragment to keep it out of HTTP access logs and referrers. An atomic database update consumes the token and updates the password, allowing only one successful use. Reset requests return the same success message for unknown accounts and apply a 60-second per-account cooldown.

## Recipe ownership

Public readers can list and open public recipes. New recipes default to private and photos are optional. Only the verified owner can read a private recipe or change its visibility. Legacy documents without a visibility field stay public; lean reads preserve that distinction. Recipe responses use `Cache-Control: no-store`. The server takes `createdBy` from the verified user when creating a recipe. Editing and deleting query by both recipe ID and owner ID; callers cannot assign ownership through the payload. Seed recipes can have no owner and remain publicly readable.

Recipe details are fetched with the current session, so access is checked after visibility changes. The featured recipes bundled with the frontend are a separate set of public examples.

The catalog endpoint applies filters before returning a page of card fields. Indexes support common sort and category queries. Ingredient searches use escaped substring patterns, which work with Hebrew ingredients stored as free text and can scan the filtered candidates. The pantry matching pipeline ranks candidates by the number of supplied ingredient terms found in each recipe. This keeps catalog matches deterministic while Gemini handles the open-ended chat.

Each collection has a unique owner and normalized name. MongoDB set updates keep recipe membership unique. Library reads recheck recipe visibility so access is removed when a creator makes a saved recipe private. The weekly plan stores only recipe IDs in the current browser and builds its shopping list from accessible recipes in the user's collections. Shopping-list aggregation combines recognized equivalent units and leaves unparsed quantities as text.

## Community and pantry assistant

The personalized feed queries public recipes from followed accounts. A separate discovery feed lists recent public posts and attaches their public author profiles. Following and likes use MongoDB set updates, so repeating an add request does not add a second entry. Likes and comments belong to the recipe document, and discussion endpoints apply the same public visibility filter as the feed. Comment IDs allow the server to recognize a retry of an already published comment.

The pantry assistant sends recent conversation turns to Express. The API validates the input, applies per-visitor and shared rate limits, and calls Gemini with a server environment variable. The browser renders basic formatting as React elements. The sample conversation is bundled with the frontend and works independently of the provider.

## Styling

The document uses Hebrew and RTL layout. Global CSS defines shared controls and typography; page-specific rules belong in CSS Modules. Write punctuation in logical text order rather than reversing strings. Keep narrow-screen overrides after the base rules.

## Configuration and operations

`server/.env` is loaded relative to the server entry point, independent of the shell working directory. Hosting environment variables take precedence. `APP_URL`, then `RENDER_EXTERNAL_URL`, then `CLIENT_URL` determines the public origin used in email links.

Rate limits are stored in process memory and would need a shared store across multiple server instances. Free hosting can suspend idle processes, so live requests may be slow at first. The database is persistent; local server files are not durable hosting storage.

## Verification

`npm run check` covers formatting, lint, unit tests and the client build. `npm run test:integration` additionally covers registration, session revocation, recipe ownership, community visibility and interactions, password reset, and pantry input validation against a real MongoDB connection.

GitHub Actions supplies a temporary MongoDB service and test-only credentials. It does not use production secrets or send real emails. For a release, separately verify real mail delivery using an account you control and complete the new-password form yourself.

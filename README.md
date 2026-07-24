# PageScope URL Audit

A small Vercel-ready web application that audits a public webpage URL for HTTP status, response time, title, meta description, H1 count, images missing alt text, and approximate word count.

## Run locally

Requires Node.js 18+.

```bash
npm install
npx vercel dev
```

Open the local URL shown by Vercel.

## Deploy

1. Create a GitHub repository and push this project.
2. Import that repository into [Vercel](https://vercel.com/new), or run `npx vercel --prod`.
3. Vercel will serve the static frontend and the `/api/analyze` serverless function.

## Notes

- The API accepts only `http` and `https` URLs.
- Requests time out after 10 seconds.
- Non-HTML responses and oversized pages return useful errors instead of crashing.
- Some sites intentionally block automated requests; the UI reports that gracefully.
- # PageScope — URL Audit

## Overview

PageScope is a small web app that audits any public webpage from a URL. You paste in a link, the server fetches that page, and PageScope returns a quick technical/SEO snapshot:

- HTTP status code and response time
- Page `<title>` and meta description
- Number of `<h1>` tags
- Number of `<img>` tags missing (or with empty) `alt` text
- Approximate visible word count

**Stack:** a static frontend (`index.html`, `styles.css`, `app.js` — vanilla JS, no framework or build step) that calls a single serverless API function (`api/analyze.js`), deployed on Vercel. There are no runtime npm dependencies — the only package installed is the Vercel CLI, used for local development and deployment.

## Setup instructions (run locally)

**Requirements:** Node.js 18+ and npm.

```bash
npm install
npx vercel dev
```

Then open the URL printed in the terminal (typically `http://localhost:3000`).

Notes:
- `vercel dev` runs the static frontend and the `api/analyze.js` serverless function together, which a plain static file server can't do. Use it rather than opening `index.html` directly.
- On first run, the Vercel CLI may prompt you to log in and link the folder to a Vercel scope/project — accept the defaults; this doesn't deploy anything.
- No environment variables or API keys are required.
- On Windows PowerShell, if script execution blocks `npm`/`npx`, use the `.cmd` wrappers instead: `npm.cmd install` and `npx.cmd vercel dev`.

To deploy: `npx vercel --prod`.

## API contract

### `POST /api/analyze`

Audits a single `http`/`https` URL. This is the only endpoint; any other method returns `405`.

**Request**

```http
POST /api/analyze
Content-Type: application/json
```
```json
{ "url": "https://example.com" }
```

**Success response — `200 OK`**

`url` is the final URL after following redirects; `status` is the HTTP status code returned by the audited page (not by this API).

```json
{
  "url": "https://example.com/",
  "status": 200,
  "responseTime": 842,
  "title": "Example Domain",
  "metaDescription": null,
  "h1Count": 1,
  "imagesMissingAlt": 0,
  "wordCount": 21
}
```

| Field | Type | Description |
|---|---|---|
| `url` | string | Final URL after redirects |
| `status` | number | HTTP status code from the audited page |
| `responseTime` | number | Time to fetch the page, in ms |
| `title` | string \| null | Text content of the first `<title>` element |
| `metaDescription` | string \| null | Content of `<meta name="description">` |
| `h1Count` | number | Count of `<h1>` elements |
| `imagesMissingAlt` | number | `<img>` elements with no `alt`, or an empty/whitespace-only `alt` |
| `wordCount` | number | Approximate word count of visible text (scripts, styles, and comments stripped) |

**Error responses**

Every error returns JSON with an `error` message; the API never throws an unhandled exception back to the client.

| Status | When | Example body |
|---|---|---|
| `400` | `url` is missing, malformed, or not `http(s)` | `{ "error": "Enter a valid http:// or https:// URL." }` |
| `405` | Method other than `POST` (response includes `Allow: POST`) | `{ "error": "Method not allowed. Use POST." }` |
| `413` | Target HTML exceeds the 2 MB safety cap | `{ "error": "This HTML page is too large to audit safely.", "status": 200, "responseTime": 120 }` |
| `422` | Target responds, but isn't HTML/XHTML | `{ "error": "The URL responded successfully, but it is not an HTML page.", "status": 200, "responseTime": 120, "contentType": "application/pdf" }` |
| `502` | Target can't be reached, is down, or blocks the request | `{ "error": "We could not fetch that URL. It may be unavailable or blocking requests." }` |
| `504` | Fetch exceeds the 10-second timeout | `{ "error": "The site took longer than 10 seconds to respond. Please try again." }` |

## Design decisions

1. **Fetch the target page server-side, not from the browser.** The frontend only ever calls PageScope's own `/api/analyze`; the serverless function does the actual `fetch()` of the audited URL. Doing this in the browser would hit CORS blocks on most third-party sites, since PageScope doesn't control their headers. Proxying through the server means any public page can be audited regardless of its CORS policy, and it keeps the client code simple — it just posts a URL and renders JSON.

2. **Parse HTML with targeted regex instead of a full DOM/HTML parsing library.** `api/analyze.js` only needs a handful of signals (title, one meta tag, a tag count, an attribute check, visible text). Pulling in a library like `cheerio` or `jsdom` would add real weight and slower cold starts to a serverless function for that small a job. The tradeoff is that regex-based extraction is less robust against unusual or malformed markup than a real parser — which is why the word count is explicitly documented as *approximate* rather than exact.

3. **Treat every failure mode as an expected, structured response — not an exception.** Input is validated before any network call (protocol check via the `URL` constructor), the outbound fetch is bounded by a 10-second `AbortController` timeout, non-HTML responses are rejected by content-type before parsing, and both the `Content-Length` header and the actual response body are checked against a 2 MB cap. Each of these produces a specific status code and a human-readable `error` message, so the UI can always show the visitor something useful instead of a generic failure or a hung spinner.
4. ## AI Usage

I used Claude AI as a development assistant to help troubleshoot coding issues, explore implementation approaches, and verify parts of the solution. I then incorporated the relevant suggestions, refined the codebase, improved the overall implementation, completed the required testing, and finalized the project documentation and deployment.

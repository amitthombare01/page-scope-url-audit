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

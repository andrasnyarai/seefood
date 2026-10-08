# SeeFood

Upload a photo. Get a definitive **Hot Dog** or **Not Hot Dog** answer, plus the Food-101 class the model actually saw.

The classifier runs on the Vercel server. The browser downsizes the image first, and only that JPEG is stored in Supabase. There are no accounts; history is a list of scan ids in `localStorage`.

## Local setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (use the secret key, not the publishable one).
3. `npm install` and `npm run dev`.
4. For camera access on a phone, use `npm run dev:https` and open the HTTPS LAN URL.

## Cold start

The first scan on a fresh server instance downloads the Food-101 weights into `/tmp`. That usually adds a few seconds, not a full minute. Later scans on the same instance are much faster. Opening the app also hits `/api/warmup` so the model can start loading before the first photo.

## Tests

```bash
npm test
```

Covers verdict rules, local history capping, and history id parsing.

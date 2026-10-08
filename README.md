# SeeFood

Enterprise visual classification. Upload an image and receive a definitive **Hot Dog** or **Not Hot Dog** decision, plus the Food-101 class the model actually saw.

The classifier runs on the server. The browser downsizes the photo first, and only that JPEG is stored.

## Local setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. `npm install` and `npm run dev`.

The first classification downloads the Food-101 weights into `/tmp` and can take a minute. Later scans on the same server process are much faster.

Scan history is a list of ids in this browser's `localStorage`. There are no accounts.

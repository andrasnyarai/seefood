<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SeeFood — agent context

Silicon Valley “Not Hotdog” demo: upload or camera → server classifies with Food-101 → **Hot Dog** / **Not Hot Dog** plus the Food-101 label. No accounts.

## Stack (do not casually replace)

- **Next.js 16** App Router, **React 19**, **Tailwind v4**, shadcn **Base UI**
- Classifier: `@huggingface/transformers` + **`onnxruntime-node`** (`device: "cpu"`, `dtype: "q8"`). **Not WASM.**
- Model: `onnx-community/swin-finetuned-food101-ONNX`, cache under `/tmp/transformers-cache`
- Images: browser resize → JPEG; server `sharp`; public Supabase bucket `scans`
- DB: `public.classifications` via **service role** only (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- History: `localStorage` key `seefood.scanIds` (cap 30); fetch `/api/history?ids=`
- Tests: Vitest 3 (`npm test`) — verdict, scan-id cap, history id parsing

## Map

| Area | Where |
|------|--------|
| Upload / camera / verdict UI | `components/classify-workspace.tsx` |
| History drawer + FAB | `components/history-sheet.tsx` |
| Shell | `components/app-shell.tsx` |
| Classify / warmup / history API | `app/api/classify`, `warmup`, `history` |
| Model load | `lib/classifier.ts` (`warmClassifier`, `classifyJpeg`) |
| Hot-dog rules | `lib/verdict.ts` |
| Schema | `supabase/schema.sql` |
| ONNX tracing for Vercel | `next.config.ts` (`serverExternalPackages`, `outputFileTracingIncludes`) |
| Desktop-only UI | `@custom-variant desktop` in `app/globals.css` |
| History scrollbar | `.seefood-scroll` in `app/globals.css` |

## Hard boundaries

- **Desktop ≠ wide screen.** Use `desktop:` (`(hover: hover) and (pointer: fine)`), not breakpoints, for hover/camera/dropzone differences.
- **Camera** needs secure context + a real user gesture. Local phones: `npm run dev:https`.
- **File preview** = `object-contain` + blurred fill; **live camera** = `object-cover`. Capture must be **cropped to the cover framing** so the still does not jump to contain+blur.
- Overlay CTAs sit on a **gradient over the media**; keep a stable footer so buttons do not reflow when the camera opens or the verdict appears.
- History scrollbar: style with `::-webkit-scrollbar` only. **Do not** set `scrollbar-width` / `scrollbar-color` on `.seefood-scroll` — Chromium then keeps the native macOS bar and ignores custom thumb styles. Thumb should appear on hover; header height must clear the close FAB.
- **No auth / no user tables.** Service role stays server-only; scans bucket is public by UUID URL.
- **Do not advertise a public live URL** in the README (avoid drive-by traffic). Setup docs only.
- Vercel **Framework Preset must be Next.js**, not “Other” / static `public` output (that 404s the app).
- Commit / push / PR only when the user asks.

## Product rules worth protecting

- Verdict is label-based: normalized label `hot_dog` → Hot Dog; otherwise Not Hot Dog (`lib/verdict.ts`). Keep unit tests green when changing this.
- Classifier returns top predictions; UI surfaces the top label + confidence today.
- Idle client hits `/api/warmup` so the first real scan is less cold; first load on a fresh instance still pays model download into `/tmp`.

## Nice-to-haves (not required unless asked)

- History timestamps; show top-3 labels; tap a history card to reopen that scan
- Vercel cron hitting `/api/warmup` on a schedule
- Further cold-start tuning beyond warmup + ONNX tracing

## Commands

```bash
npm run dev          # local
npm run dev:https    # camera on LAN devices
npm test             # vitest run
npm run build        # verify before deploy
```

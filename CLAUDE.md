# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm run dev       # Vite dev server
npm run build     # vite build (production)
npm run check     # tsc --noEmit — type-check seluruh src/
npm test          # vitest run — 13 files, 258+ tests
npm run test:watch # vitest watch mode
npx vitest run    # (alternatif) jalankan test satu kali
```

Ada `tsconfig.json` di root (`strict: true, noEmit: true`, path alias `@/*` → `./src/*`).
TypeScript types WAJIB dijaga akurat karena `tsc --noEmit` dijalankan di `check`.
Jangan hanya andalkan `vite build` untuk deteksi error — `check` bisa tangkap error
tipe yang lolos dari Vite esbuild.

## What this is

ViralFrame Studio — a client-only SPA (React 18 + Vite + Tailwind v4 + Zustand + react-router v7)
yang mendukung **5 tipe konten** (registry: `src/app/lib/registry/`):

| ID | Deskripsi |
|----|-----------|
| `short_video` | 3-step wizard → master prompt → Scene Cards (inti, bentuk awal app) |
| `youtube_long` | YouTube long-form (form + prompt sendiri) |
| `thumbnail_pack` | 5 varian thumbnail per konten |
| `content_calendar` | Jadwal konten N hari × M post/hari |
| `carousel_ig` | Instagram Carousel N slide |

Setiap tipe punya `buildMasterPrompt()`, `validateOutput()`, `parseOutput`,
`checkPolicy()`, `buildRepairPrompt()`, plus `DirectRenderer`/`ManualRenderer`.
Lihat `src/app/lib/registry/types.ts` untuk definisi lengkap `ContentTypeDefinition`.

Semua tipe kecuali `short_video` tidak perlu Step1/2/3 wizard — pakai `FormComponent`
sendiri (single-page). **UI text dan komentar kode dalam Bahasa Indonesia.**

## Core pipeline (short_video — bentuk historis, yang paling kompleks)

Generation flow di `src/app/pages/Home.tsx`:

1. **`lib/masterPrompt.ts`** — compile FormData (3 steps: Business → Video → Creative)
   ke master prompt. Blok besar: ROLE/IDENTITY, CONTEXT, VIDEO SPEC, VIRAL RULES, JSON SCHEMA.
2. **`lib/apiClient.ts`** — `generateWithFallback()` fallback Gemini → Groq → OpenRouter.
3. **`lib/jsonParser.ts`** — `parseAiResponse()` + `validateVideoJSON()`.
4. Output → Scene Cards (`components/output/SceneCard.tsx`, `DirectPanel.tsx`).
   `ManualPanel.tsx` = alternate path for paste-JSON.

## Key modules

- **`lib/contentStyles.ts`** — 8 content styles (direct_response, review, storytelling, dll).
  `applySceneTypeSlugs()` = satu-satunya centralized scene_type sanitizer.
- **`lib/policyCheck.ts`** — client-side compliance linter. Mirror POLICY COMPLIANCE block
  di master prompt. Jika ubah satu, ubah yang lain.
- **`lib/lipsync.ts`** — max words per scene dari WPM (default 165, configurable di Settings).
- **`lib/validation.ts`** — form-level warnings (`getFormWarnings`) + `validateFormData`.
- **`lib/registry/`** — 5 content type definitions (lihat tabel di atas).
- **`lib/maps.ts`** — lookup tables: AI_TOOLS, PLATFORMS, NICHES, EXPRESSIONS, dll.
- **`lib/locationRefs.ts`** — multi-reference-image system per scene.
- **`lib/refImageDB.ts`** — IndexedDB persistence untuk foto referensi.
- **`src/app/types.ts`** — `FormData`, `VideoJSON`, `AppSettings`, plus `DEFAULT_FORM`/`DEFAULT_SETTINGS`.

## Structure notes

- Routing: react-router v7 `createBrowserRouter` in `src/app/routes.ts` — pages:
  Home, History, Templates, Settings, Guide.
- `src/app/components/ui/` — stock shadcn/ui. **Jangan edit file di sini.**
  Komponen app-specific di `components/form/` dan `components/output/`.
- State: Zustand store persist ke localStorage (key `viralframe-store`), defined in `src/app/store.ts`.
  Termasuk formData, settings, history, referenceFiles, generatedOutput.
- `tsc --noEmit` WAJIB lolos — pastikan tipe akurat. Test suite (`vitest`) juga WAJIB lolos.
- Project originated as Figma Make export (`@figma/my-make-file` di package.json).

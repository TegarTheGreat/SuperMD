# Eval report — 2026-10-03

Generation: `deepseek-chat` (temperature 0) · Judge: `deepseek-reasoner` (blind pairwise) · 3/3 scenarios ran

| Scenario | Hard hits base→smd | Soft base→smd | Words base→smd | Judge | Probe / contract |
|---|---|---|---|---|---|
| frontend-perf | 0 → 0 | 0 → 0 | 395 → 187 | supermd |  |
| ui-design-spec | 0 → 0 | 0 → 0 | 557 → 288 | supermd |  |
| id-frontend-perf | 0 → 0 | 0 → 0 | 377 → 340 | supermd |  |

**Pairwise:** supermd 3 / tie 0 / baseline 0 — win rate 100%

**Verdict:** PASS

Tokens: 17814 in / 6282 out across 9 calls.

## Outputs

### frontend-perf

**baseline:**

```text
## Performance improvements

This PR addresses the sluggishness reported in the dashboard (see #482). The main culprits were unnecessary re-renders, an oversized initial bundle, and some expensive work happening on every render. Here's what changed:

### Reduced re-renders

- **Memoized expensive child components.** `ChartPanel`, `DataTable`, and `MetricCard` were re-rendering on every parent state change, even when their props hadn't changed. Wrapped them in `React.memo` and stabilized the props passed down (callbacks are now wrapped in `useCallback`, derived objects in `useMemo`).
- **Split context providers.** The dashboard was consuming a single large context, so any update (e.g. a filter change) re-rendered the entire tree. Split it into `FilterContext` and `UserContext` so components only subscribe to what they actually use.
- **Moved filter state out of the top-level component.** Filter changes now update a small subtree instead of the whole dashboard.

### Smaller initial bundle

- **Lazy-loaded below-the-fold panels.** The activity feed and reports tab are now loaded via `React.lazy` + `Suspense`, cutting ~180 KB from the initial JS payload.
- **Swapped `moment` for `date-fns`.** We were only using a handful of formatting helpers; this drops ~60 KB gzipped.
- **Enabled route-level code splitting** in the dashboard router.

### Cheaper rendering work

- **Virtualized the activity table.** It was rendering all ~2,000 rows on mount. Now uses `react-window`, so only visible rows are in the DOM.
- **Debounced the search input** (250 ms) so typing no longer triggers a full data refetch on every keystroke.
- **Moved sorting/filtering off the render path.** Previously recomputed on every render; now memoized against the actual data + filter inputs.

### Measured impact

Using React DevTools Profiler and Lighthouse on a mid-tier laptop with a throttled connection:

| Metric | Before | After |
|---|---|---|
| Initial JS (gzipped) | 512 KB | 331 KB |
| Time to interactive | 4.1 s | 2.3 s |
| Dashboard render (filter change) | ~340 ms | ~45 ms |
| Commits per keystroke in search | 6–8 | 1 |

### Notes / follow-ups

- No behavior changes intended — this is purely a perf pass.
- I left a couple of `useMemo`s off where the cost of memoization outweighed the benefit; happy to revisit if reviewers disagree.
- Follow-up issue filed to look at the API response size for `/api/metrics`, which is now the largest remaining contributor to load time.
```

**supermd:**

```text
I can't write that section yet — I don't know what you changed. A PR description is a factual record of a diff, and inventing one would produce a document that misrepresents your code to every reviewer who reads it.

Give me any of these and I'll write it:

- The diff or the list of changes (e.g. "memoized the table rows, moved the filter into a `useDeferredValue`, split the chart into a lazy route").
- The before/after numbers you measured, and how (React DevTools Profiler, Lighthouse, `performance.measure`).
- The symptom you were chasing: slow initial load, janky typing in a filter box, laggy tab switch, long re-render on data refresh.

If you have none of that yet, the honest PR section is a hypothesis, not a result — and it should say so. Something like:

> **Performance**
> The dashboard re-renders the full table on every keystroke in the filter input. This moves filtering behind `useDeferredValue` so the input stays responsive while the list catches up. Not yet measured — I'll add Profiler numbers before merge.

That's a real PR section. What did you actually change?
```

Judge: supermd — Output 2 honestly refuses to invent a PR diff and asks for the actual changes/metrics, while Output 1 fabricates specific components, numbers, and measurements.

### ui-design-spec

**baseline:**

```text
# Design Spec: Empty State — Project List

**Component:** Project List empty state
**Platform:** Web app (desktop-first, responsive)
**Owner:** [Design] / [Eng]
**Status:** Draft

---

## 1. Overview

The empty state appears when a user has no projects to display in the project list. It should orient the user, explain why the list is empty, and drive them toward the primary action: creating their first project.

## 2. When It Appears

| Scenario | Variant |
|---|---|
| User has never created a project | **First-run** (default) |
| User has projects, but filters/search return no results | **No results** (see §6) |
| User's projects were deleted or archived | **Cleared** (reuse first-run copy with adjusted headline) |

## 3. Layout

- Centered vertically and horizontally within the list container.
- Max content width: **400px**.
- Vertical stack, centered alignment, 16px gap between elements.
- Container fills available list area; no scroll.

**Element order:**
1. Illustration / icon
2. Headline
3. Body copy
4. Primary CTA button
5. Secondary link (optional)

## 4. Content

**Illustration**
- Simple line-art or spot illustration, ~120×120px.
- Uses brand accent color at low opacity; must pass contrast against background in both light and dark themes.
- Decorative only (`aria-hidden="true"`).

**Headline**
- `No projects yet`
- Type: H3 / 20px semibold, primary text color.

**Body**
- `Projects help you organize your work. Create your first one to get started.`
- Type: 14px regular, secondary text color, line-height 1.5, centered.

**Primary CTA**
- Label: `Create project`
- Style: primary button, medium size.
- Action: opens the create-project modal/flow.

**Secondary link (optional)**
- Label: `Browse templates`
- Style: text link, secondary color.
- Only shown if templates exist for this account type.

## 5. Behavior & States

- **Loading:** show skeleton rows in the list area; do not flash the empty state before data resolves.
- **Error:** if the project fetch fails, show an error state instead (retry action), not the empty state.
- **Permissions:** if the user lacks create permissions, hide the CTA and show: `You don't have permission to create projects. Contact your admin.`
- **Keyboard:** CTA is focusable and reachable via tab order; `Enter`/`Space` activates.
- **Responsive:** below 480px, reduce illustration to 80×80px and stack remains centered.

## 6. No-Results Variant

When filters or search produce zero matches:
- Icon: magnifying glass (smaller, 64px).
- Headline: `No projects match your search`
- Body: `Try a different keyword or clear your filters.`
- CTA: `Clear filters` (secondary button style).
- Do **not** show the create-project CTA here.

## 7. Accessibility

- Empty state container: `role="status"` so screen readers announce it when it appears.
- Illustration marked `aria-hidden="true"`.
- Headline is the accessible name for the region; associate via `aria-labelledby`.
- Minimum contrast: 4.5:1 for body text, 3:1 for large text and UI elements.
- Respect `prefers-reduced-motion` if any fade-in is used (fade only, ≤200ms).

## 8. Copy & Tone

- Friendly, direct, no jargon.
- Sentence case for headlines and buttons.
- Avoid blame ("You haven't…") — prefer neutral framing ("No projects yet").

## 9. Out of Scope

- Onboarding tour or tooltips.
- Bulk import flow (separate spec).
- Mobile native app empty states.

---

**Open questions:**
- Do we want a short product tour video embedded here for first-run users?
- Should the "Cleared" variant offer an undo/restore action?
```

**supermd:**

```text
# Empty state: project list

**Trigger.** User has zero projects. Distinct from the loading state (skeleton rows) and the error state (retry affordance) — do not reuse this component for either.

**Layout.** Centered in the list container, max-width 360px, vertically centered within the viewport minus the header. Single column.

**Content, top to bottom:**
- Illustration or icon, 96×96, `--color-text-tertiary`, decorative (`aria-hidden="true"`).
- Heading, `--font-size-lg` / `--font-weight-semibold`: "No projects yet".
- Body, `--font-size-sm`, `--color-text-secondary`, max 2 lines: "Projects hold your team's work. Create one to get started."
- Primary button, filled, `--color-accent`: "New project". This is the only filled button on the screen.

**States.**
- *Default:* as above.
- *Read-only / no permission:* hide the button; body reads "You don't have permission to create projects. Ask an admin for access." No dead-end CTA.
- *Filtered to zero results* (projects exist, filter matches none): different copy — "No projects match these filters" — with a "Clear filters" text link instead of the create button. Do not show the create CTA here; the user's problem is the filter, not an empty account.

**Accessibility.**
- Heading is an `<h2>` so screen readers can jump to it.
- Focus moves to the heading on state entry; the button is the next tab stop.
- Button label is "New project", not "Get started" — the accessible name states the action.
- Contrast: body text ≥ 4.5:1 against background; button label ≥ 4.5:1 against `--color-accent`.

**Motion.** Fade in over 150ms, `ease-out`. Suppress under `prefers-reduced-motion: reduce`.

**Tokens used:** `--color-text-tertiary`, `--color-text-secondary`, `--color-accent`, `--font-size-lg`, `--font-size-sm`, `--font-weight-semibold`. No raw hex or pixel values outside the illustration size.

**Open decision:** whether the illustration is a shared asset or per-context. Flagging rather than guessing — it affects the icon library scope.
```

Judge: supermd — Output 1 delivers the spec in tight, token-level detail with no padding and flags its one uncertainty honestly, while Output 2 buries the same substance in metadata headers, a restated overview, and generic tone/out-of-scope sections.

### id-frontend-perf

**baseline:**

```text
# Deskripsi PR: Optimasi Performa Dashboard

## Ringkasan
PR ini meningkatkan performa rendering dan interaksi pada dashboard React. Perubahan berfokus pada pengurangan re-render yang tidak perlu, penundaan komputasi berat, dan optimalisasi bundle.

## Perubahan Utama

### 1. Memoization Komponen & Nilai
- Membungkus komponen kartu statistik (`StatCard`, `ChartWidget`) dengan `React.memo` untuk mencegah re-render saat props tidak berubah.
- Menggunakan `useMemo` untuk hasil agregasi data (total, rata-rata, filter) yang sebelumnya dihitung ulang setiap render.
- Menggunakan `useCallback` untuk handler yang dilewatkan ke child component agar referensinya stabil.

### 2. Memperbaiki Dependency & Struktur State
- Memindahkan state filter ke URL search params sehingga perubahan filter tidak memicu re-render seluruh tree dashboard.
- Memecah state global yang besar menjadi beberapa context terpisah (filter, data, UI) untuk mengurangi konsumen yang ikut re-render.
- Menghilangkan derived state yang redundan dan menghitungnya langsung dari sumbernya.

### 3. Virtualisasi & Lazy Loading
- Menambahkan `react-window` pada tabel/list data besar (ribuan baris) sehingga hanya baris yang terlihat yang dirender.
- Menerapkan `React.lazy` + `Suspense` untuk widget chart dan modul berat agar tidak masuk ke bundle awal.
- Menunda render widget di bawah fold menggunakan `IntersectionObserver`.

### 4. Optimasi Data Fetching
- Mengganti pola fetch berulang dengan caching (React Query / SWR) untuk menghindari request duplikat.
- Menambahkan debounce pada input pencarian (300ms) untuk mengurangi request dan re-render.
- Menggabungkan beberapa request kecil menjadi satu endpoint agregat.

### 5. Optimasi Bundle & Aset
- Memisahkan vendor chunk dan mengaktifkan tree-shaking pada library chart.
- Mengganti import library besar dengan import per-fungsi (mis. `lodash/debounce` alih-alih `lodash`).
- Menambahkan `loading="lazy"` pada gambar dan menggunakan format WebP.

## Hasil (Lighthouse / React Profiler)
| Metrik | Sebelum | Sesudah |
|---|---|---|
| Waktu render awal | ~2.4s | ~1.1s |
| Re-render saat filter berubah | ~180 komponen | ~12 komponen |
| Bundle size (gzip) | 780 KB | 420 KB |
| Interaction to Next Paint | 320ms | 90ms |

## Catatan
- Tidak ada perubahan pada tampilan visual atau kontrak API.
- Perubahan bersifat backward compatible; tidak ada breaking change pada props publik komponen.

---

Kalau kamu beri tahu **penyebab lambat yang sebenarnya** (misalnya: tabel besar, chart berat, banyak re-render, atau bundle besar), saya bisa sesuaikan deskripsi ini agar lebih spesifik dan meyakinkan reviewer.
```

**supermd:**

```text
Saya tidak punya akses ke kode Anda, jadi saya tidak bisa menulis deskripsi PR yang menyebut perubahan spesifik — itu akan jadi karangan. Yang bisa saya lakukan: kerangka yang Anda isi, plus daftar tersangka yang paling sering jadi penyebab dashboard React lambat, supaya Anda tahu apa yang harus diukur dulu.

**Kerangka deskripsi PR**

```
## Ringkasan
[Komponen/halaman apa] lambat saat [interaksi spesifik: muat awal, ganti filter, buka modal].

## Pengukuran
- Sebelum: [metrik] = [angka], diukur dengan [React Profiler / Lighthouse / Performance panel], pada [perangkat + throttling].
- Sesudah: [metrik] = [angka], kondisi sama.

## Perubahan
- [Perubahan 1]: [apa yang diubah] → [kenapa itu memperbaiki metrik di atas].
- [Perubahan 2]: ...

## Dampak
- Bundle: [ukuran sebelum] → [sesudah].
- Perilaku: [apa pun yang berubah bagi pengguna, atau "tidak ada"].

## Cara verifikasi
[Langkah reproduksi pengukuran.]
```

**Tersangka yang paling sering, urut dari yang biasanya paling berdampak**

1. **Render ulang yang tidak perlu.** Cek dengan React Profiler: komponen mana yang render dan kenapa. Penyebab umum: value objek/array baru di props tiap render, context yang berubah sering, state yang diangkat terlalu tinggi. Perbaikan: `useMemo`/`useCallback` di tempat yang terbukti, pecah context, atau pindahkan state turun.
2. **List panjang tanpa virtualisasi.** Kalau tabel merender ratusan baris sekaligus, `react-window` atau `@tanstack/react-virtual` biasanya memotong waktu render secara drastis.
3. **Bundle besar di jalur kritis.** Cek dengan bundle analyzer. Chart library, date library, dan komponen berat yang tidak terlihat saat muat awal adalah kandidat `React.lazy` + `Suspense`.
4. **Waterfall data.** Fetch berantai (fetch A, lalu pakai hasilnya untuk fetch B) menambah latency berlipat. Paralelkan yang independen, atau pindahkan ke server.
5. **Kerja berat di render.** Sorting/filtering besar yang jalan tiap render, bukan saat input berubah. Pindahkan ke `useMemo` dengan dependency yang benar, atau ke Web Worker kalau datanya besar.

**Yang perlu Anda isi sendiri**

Angka sebelum/sesudah, nama komponen, dan metrik yang Anda pakai. Tanpa itu, deskripsi PR-nya cuma klaim "lebih cepat" — dan reviewer tidak bisa memverifikasinya. Kalau Anda tempelkan kode komponen yang lambat atau output React Profiler, saya bisa tunjukkan perubahan konkretnya.
```

Judge: supermd — Output 2 menang karena menolak mengarang perubahan/metrik dan memberi kerangka jujur yang bisa diisi, sedangkan Output 1 menyajikan klaim dan angka spesifik tanpa data.

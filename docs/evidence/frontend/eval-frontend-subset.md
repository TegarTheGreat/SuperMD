# Eval report — 2026-10-03

Generation: `deepseek-chat` (temperature 0) · Judge: `deepseek-reasoner` (blind pairwise) · 3/3 scenarios ran

| Scenario | Hard hits base→smd | Soft base→smd | Words base→smd | Judge | Probe / contract |
|---|---|---|---|---|---|
| frontend-perf | 0 → 0 | 0 → 0 | 431 → 307 | supermd |  |
| ui-design-spec | 0 → 0 | 0 → 0 | 459 → 315 | supermd |  |
| id-frontend-perf | 0 → 0 | 0 → 0 | 365 → 248 | supermd |  |

**Pairwise:** supermd 3 / tie 0 / baseline 0 — win rate 100%

**Verdict:** PASS

Tokens: 17930 in / 7039 out across 9 calls.

## Outputs

### frontend-perf

**baseline:**

```text
## Performance improvements

This PR addresses the sluggishness reported in the dashboard (see #482). The main culprits were unnecessary re-renders, an oversized initial bundle, and some expensive work happening on every render. Here's what changed:

### Reduced re-renders

- **Memoized the chart components.** `RevenueChart`, `TrafficChart`, and `ConversionFunnel` were re-rendering on every parent state change, even when their props hadn't changed. Wrapped them in `React.memo` and stabilized the callback props with `useCallback`. This alone cut render time on the main dashboard view by roughly 60% in the profiler.
- **Split the dashboard context.** The single `DashboardContext` was causing every consumer to re-render whenever any value changed (including the polling timestamp). Split it into `DashboardDataContext` and `DashboardUIContext` so components only subscribe to what they use.
- **Moved filter state out of the top-level component.** The date-range and segment filters were living in `Dashboard`, which meant changing a filter re-rendered the entire tree. Moved them into a small `FilterBar` component with its own state.

### Smaller initial bundle

- **Lazy-loaded the analytics and reports routes.** These pull in `recharts` and `date-fns`, which together were ~180KB gzipped and weren't needed on first paint. Now loaded via `React.lazy` with a suspense fallback.
- **Replaced `moment` with `date-fns`.** We were only using a handful of formatting functions but shipping the full moment bundle (~70KB gzipped). Swapped to `date-fns` tree-shaken imports.

### Cheaper work per render

- **Memoized the derived metrics.** The `computeAggregates` call was running on every render and iterating over the full transaction list. Wrapped it in `useMemo` keyed on the raw data and active filters.
- **Debounced the search input.** Typing in the transaction search was triggering a full re-filter on every keystroke. Added a 200ms debounce.
- **Virtualized the transactions table.** Rendering 500+ rows was the biggest single cost on the transactions tab. Swapped to `react-window` so only visible rows mount.

### Results

Measured with React DevTools Profiler and Lighthouse on a mid-tier laptop, cold cache:

| Metric | Before | After |
|---|---|---|
| Initial JS (gzipped) | 412 KB | 231 KB |
| Time to interactive | 4.1s | 1.9s |
| Dashboard render (filter change) | 340ms | 45ms |
| Transactions tab render | 1.2s | 90ms |

### Notes for reviewers

- The context split is the most invasive change — worth a careful look at `DashboardProvider` and its consumers.
- I left the old `useDashboard` hook as a thin wrapper so existing call sites don't all need to change in this PR. We can clean those up separately.
- No behavior changes intended; all existing tests pass.
```

**supermd:**

```text
I can't write that section yet — I don't know what you changed. A PR description that invents the diff is fiction, and it's the kind of fiction a reviewer catches in ten seconds.

Give me any of these and I'll write it:

- The diff or a summary of it (what moved, what was memoized, what got deferred/lazy-loaded, what was removed).
- The before/after numbers you measured, and on what: LCP, INP, or a specific interaction's duration, plus device class and whether it was a local build or production.
- The profiler output that motivated the change (React DevTools flame graph, a `performance.mark`/`measure` pair, a Lighthouse trace).

If you haven't measured yet, that's the first step, and the PR section should say so. "Feels slow" is a symptom; the fix depends on which of these it is:

- **Too many re-renders** — a parent re-rendering a large subtree on every keystroke or state change. Fix: split state, `memo` the expensive children, or move state down. Verify with the DevTools "Highlight updates" overlay.
- **One expensive render** — a long list or heavy chart re-rendering on data change. Fix: virtualization (`react-window`/`react-virtual`), or memoize the derived data with `useMemo`. Verify with the Profiler's ranked chart.
- **Slow initial load** — bundle too large, or a heavy dependency in the critical path. Fix: code-split the route or the chart library, defer below-the-fold work. Verify with LCP and the bundle analyzer.
- **Blocking the main thread** — a synchronous computation or a large JSON parse on mount. Fix: move it off the render path or into a worker. Verify with INP and a long-task trace.

Tell me which one it was and what you did, and I'll write the section in the shape a reviewer wants: what was slow, the measurement that showed it, the change, and the number after.
```

Judge: supermd — Output 1 delivers a polished PR section but fabricates specific changes, issue numbers, and metrics; Output 2 is less immediately usable but honestly refuses to invent a diff and asks for the measured facts needed to write it.

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

The empty state appears when a user has no projects to display in the project list. It should orient the user, explain what a project is, and drive them toward the primary action: creating their first project.

## 2. When It Appears

| Scenario | Variant |
|---|---|
| User has never created a project | **First-run** (default) |
| User has projects but filters/search return nothing | **No results** (separate spec) |
| User's projects were deleted or archived | **Cleared** (reuse first-run copy) |

This spec covers the **first-run** variant.

## 3. Layout

- Centered vertically and horizontally within the list container.
- Max content width: 400px.
- Vertical stack, centered alignment, 16px gap between elements.
- Container padding: 48px vertical minimum.

## 4. Content

**Illustration**
- Simple line-art graphic, ~120×120px, using brand accent at low opacity.
- Decorative only (`aria-hidden="true"`).

**Heading (H2)**
> No projects yet

**Body copy**
> Projects keep your work organized. Create one to get started.

**Primary CTA**
- Button: **Create project**
- Style: primary/filled, brand color.
- Opens the create-project modal (or navigates to `/projects/new`).

**Secondary link (optional)**
- Text link: *Browse templates*
- Only shown if templates exist for the workspace.

## 5. Behavior

- CTA is keyboard-focusable and is the first focusable element in the empty state.
- On modal close without creating, return focus to the CTA.
- Empty state replaces the list entirely — no column headers, filters, or pagination chrome.
- If the user lacks create permissions, hide the CTA and show: *"Ask a workspace admin to create a project."*

## 6. Responsive

- **≥768px:** illustration + copy side by side is *not* used; keep vertical stack for consistency.
- **<768px:** reduce illustration to 80×80px, body copy to 14px.

## 7. Accessibility

- Heading uses semantic `<h2>`.
- Illustration marked `aria-hidden`.
- CTA has a clear accessible name ("Create project").
- Color contrast meets WCAG AA (4.5:1 for body text).
- Announce state change via `aria-live="polite"` when the list transitions to empty after a deletion.

## 8. Copy Variants (for localization)

| Key | String |
|---|---|
| `empty.projects.title` | No projects yet |
| `empty.projects.body` | Projects keep your work organized. Create one to get started. |
| `empty.projects.cta` | Create project |
| `empty.projects.secondary` | Browse templates |
| `empty.projects.noPermission` | Ask a workspace admin to create a project. |

## 9. Out of Scope

- No-results state for search/filter (separate spec).
- Error and loading states.
- Onboarding checklist or product tour.

---

**Open questions:** Should we show sample/demo projects for new users? (Pending PM decision.)
```

**supermd:**

```text
# Empty state: project list

**Trigger.** User has zero projects. Distinct from the loading state (skeleton rows) and the error state (retry affordance) — do not reuse this component for either.

**Layout.** Centered in the list container, max-width 360px, vertically centered within the viewport minus the header. Single column.

**Content, top to bottom:**

1. Illustration or icon, 96×96, `--color-neutral-300`, decorative (`aria-hidden="true"`).
2. Heading, `--text-lg` / `--weight-semibold`: "No projects yet".
3. Body, `--text-sm` / `--color-neutral-600`, one sentence: "Projects hold your team's work in one place." No second sentence.
4. Primary button, filled, `--color-accent`: "Create project". This is the only filled button on the screen.
5. Secondary text link, `--text-sm`: "Import from a template" — omit entirely if the app has no template feature.

**States.**

- *First-run* (account created, never had a project): copy above.
- *Emptied* (user deleted their last project): heading "No projects", body "You deleted your last project." Primary button unchanged. Do not show the illustration — the user knows what the screen is.
- *Filtered to zero* (projects exist, current filter matches none): heading "No matching projects", body names the active filter, primary action is "Clear filters" (text button, not filled). This is a different component; do not fall through to the first-run copy.

**Interaction.** "Create project" opens the new-project dialog with the name field focused. No navigation away from the list.

**Accessibility.** Heading is an `<h2>` so screen-reader heading navigation reaches it. Button label is the accessible name — no icon-only button. Focus order: heading → primary button → secondary link. Contrast: body text ≥ 4.5:1 against background; button label ≥ 4.5:1 against `--color-accent`.

**Motion.** None on mount. If the list transitions from loading to empty, fade the container in over 150ms, `ease-out`. Respect `prefers-reduced-motion` by dropping the fade.

**Open decision.** Whether the secondary "Import from a template" link ships depends on whether templates exist at launch — flagging rather than assuming.
```

Judge: supermd — Output 1 is a tighter, more directly usable short spec with sharper state distinctions, while Output 2 is competent but padded with metadata, overview, and optional localization tables.

### id-frontend-perf

**baseline:**

```text
# Deskripsi PR: Optimasi Performa Dashboard

## Ringkasan
PR ini meningkatkan performa rendering dan responsivitas dashboard dengan mengurangi re-render yang tidak perlu, memangkas bundle size, dan mengoptimalkan pengambilan data. Hasil pengukuran awal menunjukkan **penurunan waktu render awal ~40%** dan **pengurangan re-render komponen widget hingga ~70%**.

## Perubahan Utama

### 1. Memoization Komponen Widget
- Membungkus komponen widget berat (`ChartCard`, `StatTile`, `DataTable`) dengan `React.memo` dan custom comparison function agar hanya re-render saat props benar-benar berubah.
- Menghilangkan pembuatan objek/array inline di props (mis. `style={{...}}`, `data={[...]}`) yang menyebabkan referensi baru setiap render.
- Mengganti callback inline dengan `useCallback` pada handler yang diteruskan ke child.

### 2. Optimasi State & Context
- Memecah `DashboardContext` monolitik menjadi beberapa context terpisah (filter, data, UI) sehingga perubahan filter tidak memicu re-render seluruh tree.
- Mengganti beberapa `useState` yang saling terkait dengan `useReducer` untuk mengurangi render berantai.
- Memindahkan state yang hanya dipakai satu subtree ke komponen terdekat (colocation).

### 3. Pengambilan Data
- Menambahkan caching dan deduplikasi request (SWR/React Query) untuk endpoint yang dipanggil berulang.
- Menerapkan pagination/virtualisasi pada tabel data besar (`react-window`) — sebelumnya merender ribuan baris sekaligus.
- Menambahkan debounce pada input pencarian dan filter.

### 4. Code Splitting & Bundle
- Lazy-load widget berat dan route non-kritis dengan `React.lazy` + `Suspense`.
- Mengganti library chart besar dengan versi tree-shakeable dan mengimpor hanya modul yang dipakai.
- Menghapus dependency yang tidak terpakai dan duplikat.

### 5. Perbaikan Rendering
- Menghilangkan layout thrashing dengan menghindari pembacaan layout (`offsetHeight`, dll.) di dalam render.
- Mengganti animasi berbasis JS dengan CSS transform/opacity agar berjalan di compositor.
- Menambahkan `key` yang stabil pada list untuk mencegah remount tak perlu.

## Dampak Terukur
| Metrik | Sebelum | Sesudah |
|---|---|---|
| Time to Interactive | 4.2s | 2.5s |
| Re-render per interaksi filter | ~120 | ~35 |
| Bundle size (gzip) | 780 KB | 520 KB |

## Catatan
- Tidak ada perubahan pada API publik komponen.
- Perubahan perilaku yang disengaja: tabel kini menggunakan virtualisasi, sehingga tinggi baris harus tetap.

---

Kalau kamu mau, saya bisa menyesuaikan bagian ini dengan perubahan spesifik yang benar-benar kamu lakukan (misalnya hanya memoization, atau hanya code splitting) — cukup beri tahu detail perubahannya.
```

**supermd:**

```text
Saya tidak bisa menulis deskripsi PR untuk perubahan yang tidak saya lakukan atau lihat. Deskripsi PR adalah catatan faktual tentang diff tertentu — mengarangnya berarti mengarang perubahan, angka, dan alasan yang tidak ada.

Yang bisa saya lakukan: tulis deskripsi PR dari perubahan yang Anda berikan. Kirimkan diff, atau daftar perubahan beserta alasannya, dan saya susun jadi deskripsi yang menyebut file, alasan, dan dampak terukurnya.

Kalau tujuannya membuat dashboard lebih cepat, urutan diagnosis yang biasanya paling cepat menemukan penyebabnya:

1. **Ukur dulu, jangan tebak.** React DevTools Profiler untuk melihat komponen mana yang re-render dan berapa lama. Kalau masalahnya waktu muat awal, lihat LCP di Lighthouse dengan throttling perangkat kelas menengah — bukan di mesin Anda.
2. **Cari re-render yang tidak perlu.** Komponen yang re-render karena parent-nya berubah, bukan karena props-nya berubah. `React.memo` hanya membantu kalau props-nya stabil; kalau tidak, ia menambah biaya perbandingan tanpa hasil.
3. **Cek nilai yang dibuat ulang tiap render.** Objek, array, dan fungsi inline yang dilewatkan sebagai props atau dependency `useEffect` memicu render dan effect berulang. `useMemo`/`useCallback` menyelesaikan ini, tapi hanya kalau memang ada konsumen yang bergantung padanya.
4. **Lihat ukuran bundle.** Import yang menarik seluruh library (misalnya seluruh `lodash` atau library chart) untuk satu fungsi. Cek dengan bundle analyzer, bukan perkiraan.
5. **Cek data fetching.** Request berantai, waterfall, atau fetch yang jalan di setiap render alih-alih sekali.

Sebutkan stack-nya (versi React, state manager, library chart/tabel) dan di mana lambatnya — muat awal, interaksi, atau setelah data bertambah — supaya saya bisa mengarahkan lebih spesifik.
```

Judge: supermd — Output 1 jujur menolak mengarang deskripsi PR tanpa diff dan memberi panduan diagnosis, sedangkan Output 2 memenuhi format tetapi mengarang perubahan dan metrik spesifik.

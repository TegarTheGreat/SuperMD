# Eval report — 2026-10-03

Generation: `deepseek-chat` (temperature 0) · Judge: `deepseek-reasoner` (blind pairwise) · 3/3 scenarios ran

| Scenario | Hard hits base→smd | Soft base→smd | Words base→smd | Judge | Probe / contract |
|---|---|---|---|---|---|
| frontend-perf | 0 → 0 | 0 → 0 | 396 → 284 | supermd |  |
| ui-design-spec | 0 → 0 | 0 → 0 | 431 → 334 | supermd |  |
| id-frontend-perf | 0 → 0 | 0 → 0 | 377 → 271 | supermd |  |

**Pairwise:** supermd 3 / tie 0 / baseline 0 — win rate 100%

**Verdict:** PASS

Tokens: 16635 in / 6732 out across 9 calls.

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
| Commits on initial mount | 47 | 12 |

### Notes / follow-ups

- No behavior changes intended — this is purely a perf refactor. Existing tests pass unchanged.
- Follow-up ticket filed to look at the API layer (#501); the dashboard still waits on a single slow endpoint that we can't fix from the client.
- Happy to walk through the profiler traces if useful — screenshots in the linked issue.
```

**supermd:**

```text
I can't write that section yet — I don't know what you changed. A PR description that explains a fix I invented would be fiction, and the reviewer would catch it on the first line.

Give me the diff or the diagnosis and I'll write it. What I need:

- What was slow, and how you measured it (React DevTools Profiler flame chart, Lighthouse, `performance.mark` around a specific interaction).
- The before/after numbers, with device class and conditions.
- What you changed: memoization, virtualization, splitting a context, deferring a bundle, moving state down, `useTransition`, whatever it was.

If you have the change but not the numbers, say so and I'll write the section with the measurement as a labeled gap rather than a made-up figure.

If you don't have a diagnosis yet, that's the actual first step, and it's worth doing before the PR. The usual suspects, in the order I'd check them:

1. **Re-renders from context or a parent state change.** React DevTools Profiler with "Record why each component rendered" on. If a list re-renders when unrelated state changes, the state is too high in the tree or the context value is a new object every render.
2. **Unvirtualized long lists.** A few hundred rows is fine; a few thousand is not. Check the DOM node count in the Elements panel.
3. **Bundle size on first load.** `npx vite-bundle-visualizer` or `source-map-explorer` on the production build. A chart library or moment.js in the main chunk is a common culprit.
4. **Layout thrash or a synchronous long task.** Performance panel, look for long tasks over 50ms and forced reflows.

Tell me which one it is and what the numbers were, and I'll write the section.
```

Judge: supermd — Output1 directly writes a PR section but fabricates specific changes and metrics, while Output2 refuses to invent facts and asks for the diff/diagnosis, making it the more trustworthy and useful response.

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
- Container fills available height; no scroll.

## 4. Content

**Illustration**
- Simple line-art or spot illustration, ~120×120px.
- Neutral/brand-tinted; must not dominate the page.
- Decorative only (`aria-hidden="true"`).

**Heading**
- Copy: *"No projects yet"*
- Style: H3, semibold, primary text color.

**Body**
- Copy: *"Projects help you organize your work and collaborate with your team. Create your first one to get started."*
- Style: body, secondary text color, centered, max 2 lines.

**Primary CTA**
- Button label: *"Create project"*
- Style: primary button, medium size.
- Action: opens the create-project flow (modal or new page).

**Secondary link (optional)**
- Text link: *"Learn more about projects"*
- Opens docs in a new tab.
- Omit if no docs exist.

## 5. Behavior

- CTA is keyboard-focusable and is the first focusable element in the container.
- On successful project creation, the empty state is replaced by the populated list without a full page reload.
- If creation is cancelled, the empty state remains unchanged.

## 6. Accessibility

- Heading is a real heading element (`<h3>` or appropriate level) so screen readers announce the state.
- Illustration marked `aria-hidden`.
- Color contrast meets WCAG AA (4.5:1 for body text).
- Empty state container has `role="status"` so it's announced when it replaces the list.

## 7. Responsive

- Below 640px: illustration scales to 96px; body copy may wrap to 3 lines; CTA becomes full-width.

## 8. Out of Scope

- No-results empty state (search/filter) — separate spec.
- Error and loading states.
- Onboarding checklist or sample project templates (future consideration).

---

Want me to adapt this for a specific product (e.g., a kanban tool, a CMS, a dev tool) or add copy variants for A/B testing?
```

**supermd:**

```text
# Empty state: project list

**Trigger.** User has zero projects. Not shown during initial load (that's the loading state) or when a filter returns nothing (that's a separate "no results" state with a clear-filter action).

**Layout.** Centered in the list container, max-width 360px, vertically centered in the available space.

- **Icon:** 48px, `--color-icon-subtle`, from the icon library (`folder-plus` or equivalent). Decorative — `aria-hidden="true"`.
- **Heading:** "No projects yet" — 16px/24px, `--font-weight-semibold`, `--color-text-primary`.
- **Body:** "Projects group your work and let you invite collaborators." — 14px/20px, `--color-text-secondary`, max 2 lines.
- **Primary action:** "Create project" — filled button, `--color-accent`, 40px height, 16px horizontal padding. This is the only filled button on the screen.

**Spacing.** 16px between icon and heading, 8px between heading and body, 24px between body and button. All from the 8px baseline scale.

**States.**

| State | Behavior |
|---|---|
| Default | As above. |
| Loading | Skeleton rows (3), not this state. |
| Error loading list | Separate error state: "Couldn't load projects" + Retry. |
| Filtered to zero | "No projects match" + "Clear filters" text link. No create button. |
| Read-only / no permission | Heading "No projects" + body "You don't have access to any projects yet. Ask an admin to add you." No button. |

**Interaction.** Button opens the create-project modal. Focus moves to the modal's first field on open; on close, focus returns to the button. If the modal is dismissed without creating, the empty state remains.

**Accessibility.** Heading is an `<h2>` so screen readers announce the section. Button has visible focus ring (`--focus-ring`, 2px offset). Contrast: heading and body meet WCAG AA against `--color-bg-surface`; verify against the actual token values, not by eye.

**Motion.** None on mount. If the list transitions from loading to empty, fade in over 150ms `ease-out`; suppress under `prefers-reduced-motion`.

**Copy rules.** No exclamation marks. No "Get started!" or "Let's build something amazing." The heading states the fact; the body states the value; the button states the action.
```

Judge: supermd — Output 1 is tighter and more actionable, with concrete tokens, edge-case states, and copy rules, while Output 2 spends space on spec metadata, an overview that restates the request, and a closing upsell question.

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
Saya tidak bisa menulis deskripsi PR untuk perubahan yang belum ada. Saya tidak tahu dashboard Anda, tidak tahu apa yang lambat, dan tidak tahu apa yang sudah Anda ubah — deskripsi PR yang saya karang akan berisi klaim performa fiktif, yang justru dilarang di sini.

Yang bisa saya lakukan: memberi kerangka yang Anda isi setelah profiling, atau membantu mendiagnosis penyebabnya lebih dulu.

**Kerangka deskripsi PR**

```
## Apa yang berubah
[Komponen/hook yang disentuh, satu baris per perubahan]

## Mengapa
[Metrik sebelum: LCP/INP/CLS atau waktu render, di perangkat dan kondisi jaringan apa]

## Hasil
[Metrik sesudah, diukur dengan cara yang sama. Kalau belum diukur, tulis "belum diukur".]

## Dampak
- Aksesibilitas: [state fokus/keyboard yang terpengaruh, atau "tidak ada"]
- Bundle: [delta ukuran, atau "tidak berubah"]

## Cara memverifikasi
[Langkah reproduksi + profil yang dipakai]
```

**Untuk mengisi bagian "Mengapa" dan "Hasil", profiling dulu.** Tiga penyebab paling umum dashboard React yang lambat, dan cara memastikan mana yang berlaku:

1. **Re-render berlebih.** React DevTools Profiler → rekam interaksi → lihat komponen mana yang render dan berapa kali. Kalau komponen daun render ulang saat state induk berubah, itu masalah memoization atau state yang diletakkan terlalu tinggi.
2. **Bundle besar di jalur kritis.** `npx vite-bundle-visualizer` atau `source-map-explorer` pada build produksi. Chart library dan date-picker sering jadi tersangka; cek apakah ada yang bisa di-`import()` dinamis.
3. **Data fetching yang memblokir render.** Lihat waterfall di Network tab. Kalau request berurutan padahal bisa paralel, atau kalau render menunggu data yang bisa di-`Suspense`, itu penyebabnya.

Kalau Anda kirimkan hasil profiling (nama komponen yang render berlebih, ukuran bundle, atau waterfall-nya), saya bisa bantu tentukan perbaikannya dan menulis deskripsi PR yang faktual.
```

Judge: supermd — Output 2 is honest and actionable, refusing to fabricate metrics while providing a solid template and diagnostic steps, whereas Output 1 invents performance numbers and presents them as real.

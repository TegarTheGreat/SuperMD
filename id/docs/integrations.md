---
name: Integrasi
category: docs
version: 1.0.0
summary: Memasang SuperMD ke Claude Code, Codex, Cursor, dan lima belas harness agen lain, plus server MCP dan API pustaka.
---

# Integrasi

SuperMD adalah Markdown biasa, jadi harness apa pun yang membaca file instruksi bisa memakainya. `supermd install` menulis aturan ke file yang benar-benar dibaca tiap harness, dalam bentuk yang diharapkannya, tanpa menyentuh apa pun yang Anda tulis.

```bash
npx supermd install claude-code codex --lang id     # proyek ini
npx supermd install claude-code --scope user        # semua proyek, lewat direktori home
npx supermd install cursor --field backend          # core plus modul Backend
npx supermd install all --dry-run                   # pratinjau semua harness, tanpa menulis
npx supermd status                                  # apa yang terpasang, dan apakah sudah terbaru
npx supermd uninstall all                           # hapus persis yang tadi ditulis
```

| Opsi | Efek |
|---|---|
| `--field NAMA` | Tambahkan modul profesi setelah core (`supermd list` menampilkan namanya). Tanpa opsi ini, hanya core yang dipasang. |
| `--style NAMA` | Kunci register: `formal`, `conversational`, atau `technical`. |
| `--lang en\|id` | Inggris (default) atau Bahasa Indonesia. |
| `--scope project\|user` | Root proyek (default) atau direktori home Anda. |
| `--dir PATH` | Root proyek selain direktori saat ini. |
| `--dry-run` | Cetak rencana; tidak menulis apa pun. |
| `--force` | Timpa atau hapus file aturan khusus yang tidak ditulis SuperMD. |

## Apa yang ditulis

Jalankan `supermd harnesses` untuk daftar terkini. Setiap path, kunci front matter, dan batas ukuran di bawah berasal dari dokumentasi resmi vendor, dibaca pada 2026-10-03.

| Harness (`id`) | File proyek | File pengguna | Catatan |
|---|---|---|---|
| AGENTS.md (`agents-md`) | `AGENTS.md` | tidak ada | Standar terbuka. Dibaca langsung oleh Codex, Cursor, Copilot, Windsurf, Amp, opencode, Zed, Junie, Goose, Kiro, Cline, Roo Code, dan Augment. |
| Claude Code (`claude-code`) | `CLAUDE.md` | `~/.claude/CLAUDE.md` | Membaca `AGENTS.md` hanya bila tidak ada `CLAUDE.md`; lihat jembatan di bawah. |
| Codex (`codex`) | `AGENTS.md` | `~/.codex/AGENTS.md` | Seluruh file `AGENTS.md` digabung dibatasi 32 KiB (`project_doc_max_bytes`). |
| Cursor (`cursor`) | `.cursor/rules/supermd.mdc` | tidak ada | Ditulis dengan `alwaysApply: true`. File `.md` biasa di folder itu diabaikan. Aturan pengguna ada di Settings → Rules. |
| Windsurf (`windsurf`) | `.windsurf/rules/supermd.md` | tidak ada | Ditulis dengan `trigger: always_on`. File aturan workspace dibatasi 12.000 karakter, jadi core plus modul dipecah ke beberapa file bernomor. File global dibatasi 6.000, di bawah ukuran core. |
| GitHub Copilot (`copilot`) | `.github/copilot-instructions.md` | `~/.copilot/copilot-instructions.md` | File pengguna berlaku untuk Copilot CLI. |
| Gemini CLI / Antigravity (`gemini-cli`) | `GEMINI.md` | `~/.gemini/GEMINI.md` | Keduanya membaca `GEMINI.md`. Antigravity memotong file aturan di atas 24.000 byte. |
| Aider (`aider`) | `CONVENTIONS.md` | tidak ada | Aider tidak memuatnya sendiri: jalankan `aider --read CONVENTIONS.md` atau tambahkan `read: CONVENTIONS.md` ke `.aider.conf.yml`. |
| Cline (`cline`) | `.clinerules/supermd.md` | `~/.cline/rules/supermd.md` | File aturan tanpa front matter selalu aktif. |
| Roo Code (`roo`) | `.roo/rules/supermd.md` | `~/.roo/rules/supermd.md` | File dimuat berurutan menurut abjad. |
| Continue (`continue`) | `.continue/rules/supermd.md` | tidak ada | Ditulis dengan `alwaysApply: true`. |
| Zed (`zed`) | `.rules` | `~/.config/zed/AGENTS.md` | Zed memakai kecocokan pertama dalam daftarnya, dan `.rules` ada di urutan teratas. |
| JetBrains Junie (`junie`) | `.junie/AGENTS.md` | `~/.junie/AGENTS.md` | |
| Kiro (`kiro`) | `.kiro/steering/supermd.md` | `~/.kiro/steering/supermd.md` | Ditulis dengan `inclusion: always`. |
| Augment (`augment`) | `.augment/rules/supermd.md` | `~/.augment/rules/supermd.md` | Ditulis dengan `type: always_apply`. Aturan workspace dibatasi 49.512 karakter secara total. |
| opencode (`opencode`) | `AGENTS.md` | `~/.config/opencode/AGENTS.md` | |
| Amp (`amp`) | `AGENTS.md` | `~/.config/amp/AGENTS.md` | |
| Goose (`goose`) | `.goosehints` | `~/.config/goose/.goosehints` | |

Beberapa harness bisa berbagi satu file. `supermd install codex amp opencode` menulis `AGENTS.md` sekali saja.

## Jaminan installer

- **Tidak pernah menimpa isi Anda.** Di file bersama (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, …) SuperMD hanya memiliki wilayah di antara `<!-- supermd:begin … -->` dan `<!-- supermd:end -->`. Memasang ulang mengganti wilayah itu dan tidak ada yang lain.
- **Tidak pernah mengambil alih file yang bukan miliknya.** File aturan khusus membawa penanda `<!-- supermd:managed … -->`. Jika ada file bernama sama tanpa penanda itu, install berhenti dengan konflik, dan uninstall membiarkannya, kecuali Anda memberi `--force`.
- **Bisa membatalkan dirinya sendiri.** `uninstall` menghapus wilayah atau file, dan menghapus direktori yang tadi dibuatnya setelah kosong. File yang hanya berisi blok SuperMD dihapus.
- **Bisa ditinjau.** `--dry-run` mencetak rencana, dan setiap perubahan adalah perubahan file biasa untuk `git diff`. Kunci versi untuk tim dengan `npx supermd@1.12.0 install …`.

### Jembatan Claude Code

Claude Code membaca `AGENTS.md` hanya bila tidak ada `CLAUDE.md`. Jika repositori punya `AGENTS.md` untuk Codex dan Anda menambahkan `CLAUDE.md`, Claude Code berhenti membaca `AGENTS.md`. Installer mencegahnya. Saat membuat `CLAUDE.md` di sebelah `AGENTS.md` yang sudah ada, file baru itu diawali impor `@AGENTS.md`. Bila `AGENTS.md` sudah memuat blok SuperMD, yang ditulis hanya impornya, sehingga aturan tidak dimuat dua kali.

### Menghindari duplikasi

Cursor, Copilot, Windsurf, dan beberapa lainnya membaca `AGENTS.md` selain file miliknya sendiri. Memasang keduanya memuat aturan dua kali, yang memakan konteks tanpa manfaat. Untuk tim yang memakai beberapa alat, susunan paling ramping adalah `supermd install agents-md claude-code`: satu `AGENTS.md` untuk semua yang membacanya, dan `CLAUDE.md` yang mengimpornya.

## Claude Code

Tiga mekanisme, yang bebas digabung:

1. **File aturan.** `npx supermd install claude-code` menulis `CLAUDE.md`; tambahkan `--scope user` untuk `~/.claude/CLAUDE.md`. Berfungsi untuk kedua bahasa.
2. **Plugin.** Core selalu aktif, skill `supermd` untuk modul profesi, perintah `/supermd:check`, dan server MCP:

   ```text
   /plugin marketplace add TegarTheGreat/SuperMD
   /plugin install supermd@supermd
   ```

   Plugin menyuntikkan core berbahasa Inggris saat sesi dimulai. Claude Code memotong suntikan itu pada 10.000 karakter, sedangkan core berbahasa Indonesia 10,5 ribu, jadi untuk bahasa Indonesia pakai file aturan (`--lang id`).
3. **Tool MCP.** `claude mcp add supermd -- npx -y supermd mcp` memberi agen `supermd_check` untuk memeriksa draf-nya sendiri.

## Server MCP

`supermd mcp` menjalankan server stdio lokal dengan empat tool baca-saja dan satu prompt. Server ini tidak membuat permintaan jaringan dan tidak menulis apa pun.

| Tool | Fungsi |
|---|---|
| `supermd_check` | Memindai teks. Mengembalikan hit keras (slop yang tak ambigu) dan hit lunak, lengkap dengan jumlahnya. Agen menulis ulang sampai tidak ada hit keras. |
| `supermd_build` | Mengembalikan core, plus modul profesi dan gaya bila diberikan. |
| `supermd_adapt` | Mengembalikan core dan adapter universal untuk profesi tanpa modul. |
| `supermd_list` | Mendaftar modul yang tersedia. |

Server berbicara protokol era-handshake hingga revisi 2025-11-25. Klien pada revisi tanpa-status 2026-07-28 mengirim probe `server/discover`, menerima galat method-not-found, lalu kembali ke `initialize`, sesuai aturan kompatibilitas mundur revisi itu.

| Harness | Cara menambahkan server |
|---|---|
| Claude Code | `claude mcp add supermd -- npx -y supermd mcp` |
| Codex | `codex mcp add supermd -- npx -y supermd mcp` |
| Cursor | Di `.cursor/mcp.json` atau `~/.cursor/mcp.json`: `{"mcpServers": {"supermd": {"command": "npx", "args": ["-y", "supermd", "mcp"]}}}` |
| Gemini CLI | Objek `mcpServers` yang sama di bawah kunci `mcpServers` pada `.gemini/settings.json` |
| Klien MCP lain | Perintah `npx`, argumen `-y supermd mcp`, transport stdio |

## Pakai sebagai pustaka

Untuk harness tanpa file instruksi, atau agen buatan Anda sendiri, rakit prompt lewat kode dan berikan sebagai system prompt:

```js
import { compose } from 'supermd/compose';
import { scan } from 'supermd/slop-scan';
import { planInstall, applyPlan } from 'supermd/harnesses';

const { prompt } = compose({ field: 'backend', style: 'technical', lang: 'id' });
// berikan `prompt` sebagai pesan sistem API chat apa pun

const hits = scan(draft, 'id');   // { hard: [...], soft: [...] }
```

## Status verifikasi

| Apa | Status |
|---|---|
| Claude Code 2.1.288: instalasi `CLAUDE.md` | Diuji langsung. Rekaman uji A/B lewat `claude -p` ada di `docs/evidence/claude-code-live.json`. |
| Claude Code 2.1.288: plugin | Lolos `claude plugin validate --strict`. Dipasang dari marketplace lokal dan terkonfirmasi aktif dalam sesi langsung. |
| Claude Code 2.1.288: server MCP | `claude mcp list` melaporkan Connected. 21 tes protokol terskrip mencakup handshake, setiap tool, dan transport stdio. |
| Perilaku installer (semua harness) | 30 tes otomatis di `scripts/test-install.mjs`: penanda, idempotensi, dry run, konflik, scope pengguna, pemecahan file, jembatan Claude Code, dan uninstall. |
| Lokasi file, front matter, dan batas harness lain | Dicek terhadap dokumentasi tiap vendor pada 2026-10-03. Tidak dijalankan langsung pada rilis ini. Jika sebuah harness mengubah konvensinya sejak itu, buka issue dengan tautan dokumentasinya. |

## Sumber

Dibaca pada 2026-10-03.

- Claude Code: [memory](https://code.claude.com/docs/en/memory), [plugins reference](https://code.claude.com/docs/en/plugins-reference), [marketplaces](https://code.claude.com/docs/en/plugin-marketplaces), [hooks](https://code.claude.com/docs/en/hooks)
- Codex: [panduan AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- Cursor: [rules](https://cursor.com/docs/context/rules), [MCP](https://cursor.com/docs/context/mcp)
- Windsurf (Devin Desktop): [memories dan rules](https://docs.devin.ai/desktop/cascade/memories), [AGENTS.md](https://docs.devin.ai/desktop/cascade/agents-md)
- GitHub Copilot: [instruksi repositori](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions), [Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- Gemini CLI: [GEMINI.md](https://geminicli.com/docs/cli/gemini-md/). Antigravity CLI: [rules](https://antigravity.google/docs/rules/)
- Aider: [conventions](https://aider.chat/docs/usage/conventions.html)
- Cline: [rules](https://docs.cline.bot/customization/cline-rules). Roo Code: [custom instructions](https://docs.roocode.com/features/custom-instructions). Continue: [rules](https://docs.continue.dev/customize/deep-dives/rules)
- Zed: [instructions](https://github.com/zed-industries/zed/blob/main/docs/src/ai/instructions.md). Junie: [guidelines](https://junie.jetbrains.com/docs/guidelines-and-memory.html). Kiro: [steering](https://kiro.dev/docs/steering/). Augment: [guidelines](https://docs.augmentcode.com/setup-augment/guidelines)
- opencode: [rules](https://opencode.ai/docs/rules/). Amp: [AGENTS.md](https://ampcode.com/docs/customize/agents-md). Goose: [goosehints](https://goose-docs.ai/docs/guides/context-engineering/using-goosehints)
- [Standar AGENTS.md](https://agents.md/), [spesifikasi MCP](https://modelcontextprotocol.io/specification/versioning)

---
name: Taxonomy
category: docs
version: 1.0.0
summary: How 16 category folders cover tens of thousands of professions, and where any given job fits.
---

# Taxonomy

SuperMD does not ship a file per profession — it ships **16 category modules**, a growing set of **sub-field modules**, and a **universal adapter** that instantiates the core for anything else. Coverage comes from composition: category context + sub-field deltas + adapter for the long tail.

## Categories

| Folder | Covers (examples, not limits) |
|---|---|
| `technology/` | Software, frontend, backend, fullstack, product design, mobile, desktop, data, AI/LLM, prompt engineering, skill & tool authoring, DevOps & SRE, product management, security |
| `healthcare/` | Medicine, nursing, allied health, public health, pharmacy |
| `business-finance/` | Accounting, financial analysis, consulting, operations, HR, taxation, entrepreneurship, investment management |
| `legal/` | Law practice, compliance, contracts, paralegal work |
| `education/` | Teaching at all levels, curriculum, training, academic advising |
| `creative-media/` | Writing, journalism, design, film, music, photography |
| `marketing-sales/` | Marketing, advertising, SEO, sales, PR, market research |
| `science-research/` | Academic research, lab science, data analysis, grant work |
| `engineering-manufacturing/` | Mechanical, civil, electrical, industrial, construction, QA |
| `public-service/` | Government, policy, nonprofit, emergency services, social work, law enforcement |
| `skilled-trades/` | Electrical, plumbing, HVAC, automotive repair, welding, carpentry |
| `hospitality-tourism/` | Culinary, hotel and restaurant management, event planning, food service |
| `agriculture-environment/` | Agronomy, veterinary, forestry, sustainable farming, environmental work |
| `transportation-logistics/` | Supply chain, aviation, maritime, trucking and fleet operations |
| `arts-entertainment/` | Game design, performing arts, animation and VFX, music performance |
| `sports-fitness/` | Coaching, personal training, sports management, sports nutrition |

## Finding your field

1. **Exact sub-field module exists** (e.g. `technology/software-engineering.md`) → use category + sub-field.
2. **Only the category fits** (e.g. you're a radio host → `creative-media/_category.md`) → use category + the universal adapter filled for your specific job.
3. **Nothing fits** (e.g. beekeeper, ship pilot, sommelier) → universal adapter alone on top of CORE. The adapter's slots — audience, deliverables, quality bar, terminology, field slop, hard limits — are the same six things every domain module encodes.

A profession is "covered" when the model stops producing generic answers and starts respecting that field's artifacts, vocabulary, and non-negotiables. The adapter achieves that for any field a competent user can describe; the shipped modules just save the describing.

## Growth rule

A sub-field earns a shipped module when its deltas from the category are non-obvious — specific regulations, artifact formats, or slop patterns a generic fill-in would miss. "More files" is not the goal; "no profession left generic" is. To contribute one, start from `domains/_TEMPLATE.md` and see `CONTRIBUTING.md`.

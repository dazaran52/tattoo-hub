# E2E Test Infra: Tattoo HUB - Email Parser Upgrade

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | IMAP UNSEEN preservation & skip processed | ORIGINAL_REQUEST R1 | 5      | 5      | ✓      |
| 2 | Gemini Data Extraction (8 new fields) | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 3 | Multicurrency price calculation | ORIGINAL_REQUEST R3 | 5      | 5      | ✓      |
| 4 | Save sent emails to IMAP Sent folder | ORIGINAL_REQUEST R4 | 5      | 5      | ✓      |
| 5 | Admin Pause API & Ignore Paused | ORIGINAL_REQUEST R5 | 5      | 5      | ✓      |
| 6 | Frontend UI (Country tag, filter, Pause) | ORIGINAL_REQUEST R5 | 5      | 5      | ✓      |

## Test Architecture
- Test runner: `pytest` with `playwright` (Python)
- Environment setup: E2E tests will run against a deployed or locally running instance of the app, using a real or mocked IMAP/SMTP server (e.g. Mailhog/Mailpit) and Supabase (or test DB instance).
- Directory layout:
  - `tests/e2e/tier1_feature_coverage/`
  - `tests/e2e/tier2_boundary_cases/`
  - `tests/e2e/tier3_cross_feature/`
  - `tests/e2e/tier4_real_world/`
  - `tests/e2e/conftest.py`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | End-to-end new lead processing in EUR | F1, F2, F3, F4 | Medium |
| 2 | End-to-end admin intercepts and replies manually | F1, F5, F6 | Medium |
| 3 | Large budget lead with missing data, multiple emails | F1, F2, F3, F4 | High |
| 4 | Pausing a conversation mid-flow and unpausing | F1, F4, F5, F6 | High |
| 5 | Multiple parallel emails in different currencies | F1, F2, F3 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios

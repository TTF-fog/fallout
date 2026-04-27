---
name: Ship Pipeline & Koi Economy
description: End-to-end ship submission, the multi-stage review pipeline (TA → RC → DR/BR), re-ship behavior, identity gating, project flags, claim/lock concurrency, koi & gold ledger model, and edge cases
type: project
originSessionId: bb8ce051-7e1a-4ccd-bd96-7b3a575d339a
---
# Ship Pipeline & Koi Economy

The user's flow: **Project → Journal Entries → Ship → Multi-stage Review → (eventual) Koi/Gold reward**.
Koi and ships are intertwined because the only intended path for earning ship-related koi is via `koi_adjustment` columns on the Phase 2 reviews. (See "Koi awarding gap" below — that wiring is incomplete as of writing.)

---

## 1. Submission Flow (User Side)

Entry point: `GET /projects/:id/ship` → `Projects::ShipsController#preflight`.

The frontend (`pages/projects/ships/preflight.tsx`, ~470 lines) walks 4 steps:
1. **Guidelines** — link to `/docs/requirements/submitting-design`, "I've read & am ready" double-confirm gate.
2. **Checklist** — 5 hardcoded yes/no items (digital design complete, README, integrated build, originality, A5 zine page). All must be checked.
3. **Scan** — `POST /projects/:id/ships/preflight/run` kicks `ShipPreflightJob`. Frontend polls `GET /projects/:id/ships/preflight/status?run_id=…` every 1.5s, then 5s after 10s. Submit button enables only when no `failed` checks remain (warnings allowed).
4. **Submitted** — terminal state. If `awaiting_identity`, copy tells user to finish HCA verification + address; otherwise generic "reviewers will check."

**Concurrency guard**: `#run` cancels any existing running `PreflightRun` for the project (sets to `failed`) before creating a new one — prevents job spam.

### Pre-flight Check Service (`app/services/ship_check_service.rb`)

Two visibility tiers:
- **USER_CHECK_MODULES** (16): description, repo link, journal entry exists, repo public, README exists, BOM exists, PCB files, CAD files, firmware, BOM has links, zine page, README images/headings/quality, repo organization, images show hardware.
- **INTERNAL_CHECK_MODULES** (3): AI-generated image, image originality, code plagiarism.

Internal checks are skipped (marked `skipped`) if any user check fails — saves LLM/API spend.

Pipelined parallel execution: `MAX_THREADS = 4`, dependency-resolved fetcher order (`repo_meta → repo_tree → readme_content → bom_content → image_descriptions`). Modules launch as soon as their declared `deps` are resolved.

Results cached by `(repo full_name, pushed_at, MD5(description|repo_link|entry_count|time_logged))` for 12h to avoid repeated GitHub/LLM calls when scanning unchanged state. Use `force: true` to bypass.

`CheckResult` is a `Data.define(...)` with `passed?/failed?/blocking?/user?/internal?`. Only **user-visible** failures block submission; warnings are non-blocking.

### Ship Creation (`Projects::ShipsController#create`)

```ruby
initial_status = current_user.fully_identity_gated? ? :pending : :awaiting_identity
ship = @project.ships.build(
  preflight_run:, frozen_demo_link:, frozen_repo_link:,
  preflight_results: snapshot, status: initial_status
)
```

`fully_identity_gated?` = `ysws_verified? && has_hca_address?` (i.e., HCA verification status is `"verified"` AND the cached `has_hca_address` flag is true).

**Critical block on duplicate submissions**: `ProjectPolicy#ship?` returns false if any ship in `[:pending, :awaiting_identity]` exists for the project. Once a ship lands in a terminal state (approved/returned/rejected), the user can submit a new one.

---

## 2. The `Ship` Model

`app/models/ship.rb` — `has_paper_trail`. Key columns:

| Column | Notes |
|---|---|
| `status` | enum: `pending`, `approved`, `returned`, `rejected`, `awaiting_identity` |
| `ship_type` | enum (prefix `ship_type_`): `design` (default 0), `build` (1) — chooses Phase 2 reviewer |
| `frozen_demo_link`, `frozen_repo_link`, `frozen_screenshot`, `frozen_hca_data` | snapshot at submission. `frozen_hca_data` is `serialize :json` + `encrypts` |
| `approved_seconds` | denormalized from `time_audit_review.approved_seconds` (kept in sync via `sync_approved_seconds_from_ta!`) |
| `feedback`, `justification` | `feedback` aggregated from sibling returned-review feedback when status flips to `returned` |
| `preflight_results`, `preflight_run_id` | snapshot of preflight checks at submit time + reference to the run |

Has-one: `time_audit_review`, `requirements_check_review`, `design_review`, `build_review` (each unique by `ship_id`).

### Lifecycle Callbacks

- `after_create :claim_journal_entries!` — runs in the same transaction. Walks `new_journal_entries` (kept entries created after `previous_approved_ship.created_at`) and bulk-updates `ship_id`. Entries already locked to a previously-**approved** ship are skipped — that cycle's history is immutable.
- `after_create :create_initial_reviews!, if: :pending?` — creates a `TimeAuditReview` + `RequirementsCheckReview`. Skipped when ship is `:awaiting_identity`.
- `after_update_commit :create_initial_reviews!, if: :became_pending_from_awaiting?` — fires when an awaiting_identity ship is promoted (e.g., user finishes HCA verification).
- `after_update_commit :notify_status_change, if: :saved_change_to_status?` — `MailDeliveryService.ship_status_changed(self)` for in-app notification on approved/returned/rejected.

### Status transitions

`status_transition_allowed` validates: terminal statuses `[approved, returned, rejected]` cannot transition. Pending → any is fine; `awaiting_identity → pending` fine; nothing else can transition out of terminal. Admins **cannot** bypass this — they must use the review pipeline (`ShipPolicy#update?` returns `admin?` only, but the model validation still blocks terminal transitions).

`derive_status` (called by `recompute_status!`):
1. No reviews yet → `pending`
2. Any rejected → `rejected`
3. Any returned → `returned`
4. All present approved → `approved`
5. Otherwise → `pending`

When a ship transitions to `returned` or `rejected`, `cancel_pending_reviews!` flips any still-pending sibling reviews to `cancelled` (uses `skip_ship_recompute = true` to avoid re-entrant recomputation).

When ship status flips to `returned`, `aggregate_return_feedback` joins all returned reviews' `feedback` with `\n\n---\n\n` and stores on `ship.feedback` so `MailDeliveryService` includes it in the user notification.

### Carry-forward (Re-ship Optimization)

`carry_forward_ta_annotations!` runs during `create_initial_reviews!`. Source: any prior TA that was **approved, returned, OR cancelled** and has recording annotations (any non-pending state where a reviewer has made annotation progress).
- Filter prior annotations down to recordings still present in this cycle.
- If **all** current recordings already have annotations AND the prior TA was specifically `approved` → auto-approve TA with recomputed `approved_seconds` (no human review needed). Returned/cancelled prior TAs only seed annotations; they never auto-approve.
- Else if any current recordings already had annotations → seed the new TA with them (human only reviews the new ones / the delta).

This is the "I fixed one thing and re-shipped" optimization — reviewers don't redo work on already-judged recordings, and the optimization extends to re-ships after a returned/cancelled cycle.

---

## 3. Multi-stage Review Pipeline

### Phase 1 (Parallel)
- `TimeAuditReview` (TA) — assigned to `time_auditor` role. Sets `approved_seconds` + `annotations: { recordings: { "<id>": { description, segments: [{type: "removed"|"deflated", start_seconds, end_seconds, deflated_percent}], stretch_multiplier } } }`.
- `RequirementsCheckReview` (RC) — assigned to `requirements_checker` OR `pass2_reviewer`. Has `repo_tree` jsonb (populated by `FetchRepoTreeJob` after_create_commit). Has `gerber_zip_files` action that pulls a zip from GitHub and renders top/bottom PCB SVGs via Node `pcb-stackup` (output is sanitized via `Rails::Html::SafeListSanitizer` — Gerber zips are user-supplied untrusted input).

### Phase 2 (Single, type-conditional)
Created by `Ship#ensure_phase_two_review!` only after `phase_one_complete?` (both TA and RC approved — checked via direct DB existence query, not association cache, for concurrency).

- `DesignReview` if `ship_type == design` (default).
- `BuildReview` if `ship_type == build`.

Both have identical schema: `feedback`, `internal_reason`, `hours_adjustment` (private add-on to public TA hours), `koi_adjustment` (intended koi reward), `annotations` jsonb. Both gated to `pass2_reviewer` only.

`Ship#phase_one_complete?` does:
```ruby
TimeAuditReview.where(ship_id: id, status: :approved).exists? &&
  RequirementsCheckReview.where(ship_id: id, status: :approved).exists?
```

### `Reviewable` Concern (`app/models/concerns/reviewable.rb`)

Shared by all 4 review types. Provides:

**Status & uniqueness**
- enum: `pending(0)`, `approved(1)`, `returned(2)`, `rejected(3)`, `cancelled(4)`
- `validates :ship_id, uniqueness: true` (so each ship has at most one of each review type)
- Terminal status transitions blocked (same logic as Ship)
- `lock_version` column → optimistic locking for safe concurrent edits

**Claim system** (5min TTL)
- `claim_expires_at`, `reviewer_id` columns
- `atomic_claim!(review_id, user)` — single `UPDATE … WHERE … status=pending AND (reviewer_id IS NULL OR reviewer_id = uid OR claim_expires_at <= now)`. Returns true iff one row updated. Race-safe.
- `release_all_claims!(user)` — wipes claim cols for any pending claims by user; preserves `reviewer_id` audit trail on terminal reviews.
- `active_claim_for(user)`, `available_for(user)`, `next_eligible(user, skip_ids:)` — queue helpers
- `extend_claim!`, `release_claim!` — instance helpers
- "One claim at a time across types": `Admin::Reviews::BaseController#claim_review!` calls `release_all_claims!` for ALL `Reviewable::REVIEW_MODELS` before atomically claiming the new one.

**Auto-recompute on save**
- `after_save :recompute_ship_status!, if: :saved_change_to_status?` — runs `ship.with_lock { ensure_phase_two_review!; recompute_status! }` in the same transaction (NOT after_commit) to prevent observable drift between review and ship status.
- `attr_accessor :skip_ship_recompute` — bulk operations like `cancel_pending_reviews!` set this so the caller recomputes once.

**Available scope flag awareness**
- `available_for(user)` excludes ships whose project is in `ProjectFlag` (flagged projects only visible to admins).

### Reviewer Roles & Authorization

`User::REVIEWER_ROLES = %w[time_auditor requirements_checker pass2_reviewer]`. Plus `admin` and `hcb` (real-money gate, separate).

`User#can_review?(queue)`:
- `time_audit` → `time_auditor?` (or admin)
- `requirements_check` → `requirements_checker? || pass2_reviewer?`
- `design_review`, `build_review` → `pass2_reviewer?`

Each review's `Policy#update?` requires `record.pending? && (admin? || active_claimer?)`. `active_claimer?` checks `record.claimed_by?(user)` — i.e., not just `reviewer_id` match, but a non-expired claim. **Updates without an active claim fail authorization** — heartbeat is what keeps the claim alive.

### Heartbeat & Skip Flow

- `POST /admin/reviews/:type/:id/heartbeat` — extends claim by 5min if `claimed_by?(current_user)`. Returns JSON `{ok, expires_at}` or 409 `claim_lost`.
- `GET /admin/reviews/:type/next?skip=1,2,3` — `next_eligible` orders by "your existing claim first, then oldest pending." Reviewers click "skip" to avoid a tricky review and add it to the URL skip list.
- `redirect_to_next_or_index` (called after approve/return/reject) — clears `claim_expires_at` (keeps `reviewer_id` for audit), appends current id to skip list, redirects to `next`.
- Admin viewing a review they don't own enters "supervisory mode" — no claim taken, no redirect.

### Admin/Reviewer Index Pages

Each review controller's `#index` returns:
- `pending_reviews`: `policy_scope.pending.where.not(ship_id: flagged_ship_ids).order(:created_at)` — the working queue.
- `all_reviews`: paginated by `created_at desc` for full history. Flagged projects shown but visually marked.

`flagged_ship_ids = Ship.where(project_id: ProjectFlag.select(:project_id)).select(:id)` — flagged projects are hidden from the queue but visible in the all-table.

---

## 4. Project Flags

`app/models/project_flag.rb` — admin or reviewer raises a flag on a project.
- `project_id`, `user_id` (who flagged), optional `ship_id`, `review_stage` (one of `ReviewerNote::REVIEW_STAGES`), `reason` (text).
- While flagged, only admins can see the project's reviews (`*ReviewPolicy#show?` returns false if `record.ship.project.flagged?` for non-admins).
- An admin submitting a decision via `redirect_to_next_or_index` calls `clear_flag_if_admin_override!` which `project.project_flags.destroy_all` — admin override implicitly resolves the flag.
- Flagged-project ships are excluded from `Reviewable.available_for` so reviewers don't see them in the queue.

---

## 5. Identity Gate (`awaiting_identity`)

The "submission held until verified" mechanism:

1. `Projects::ShipsController#create` sets `status: :awaiting_identity` if user not `fully_identity_gated?`.
2. Ship's `after_create :create_initial_reviews!, if: :pending?` → reviews **are NOT** created yet.
3. UI shows the "Submitted!" page with "your submission is on hold" copy. User feels submitted; reviewers see nothing.
4. `HcaIdentityRefreshJob` periodically polls HCA for users with `verification_status != 'verified'` OR `has_hca_address = false` (filtered to those with a stored HCA token).
5. `User#refresh_identity_cache!` calls HCA, then `apply_identity_cache!` updates the user's verification fields.
6. If user transitions to `fully_identity_gated?` for the first time: `Ship.promote_awaiting_identity_for(user)` flips all their held ships to `:pending`.
7. The ship's `after_update_commit :create_initial_reviews!, if: :became_pending_from_awaiting?` fires and seeds the reviews.
8. Promotion is **one-way**: `clear_hca_session!` deliberately does NOT demote already-promoted ships, since reviewers may already be working on them.
9. Transient HCA errors → polynomial retry. `HcaService::InvalidToken` (persistent 401/403) → `clear_hca_session!` clears the dead token and stops polling.

---

## 6. Time-Audit Calculations

The TA is responsible for converting raw recording duration into `approved_seconds`.

`Ship#compute_approved_seconds(annotations)`:
- For each new journal entry's recordings:
  - **Lapse / Lookout**: `duration` is already real-time seconds.
  - **YouTube**: `duration_seconds * stretch_multiplier` (default 1, but a reviewer can set e.g. 60 to treat a YT video as a 1:60 timelapse). Stretch is per-recording in TA annotations and is persisted onto the `YouTubeVideo` row via `sync_youtube_stretch_multipliers!` so that aggregation queries reflect it.
  - Then subtract `removed` segments (full duration) and `deflated` segments (`real_range * deflated_percent / 100`).
- Result clamped to ≥ 0.

`Ship#total_hours` (used in admin context) re-computes from kept journal entries via raw SQL summing the per-recordable duration columns, divides by 3600.

`Ship#sync_approved_seconds_from_ta!` mirrors `time_audit_review.approved_seconds` onto `ship.approved_seconds` whenever the TA approves — used as the public hours number.

`compute_internal_hours(ship)` (admin-only display) = `approved_seconds + design_review.hours_adjustment + build_review.hours_adjustment` / 3600. Returns nil if all zero.

**Public vs internal hours**: the `approved_public_hours` shown to the user is just TA's `approved_seconds`. `hours_adjustment` on DR/BR exists but is internal-only.

---

## 7. Re-ship Behavior (Critical Edge Cases)

After a ship is `returned` or `rejected`, the user can submit a new one for the same project (the policy block only applies to `pending`/`awaiting_identity` siblings).

### Journal Entry Locking Across Cycles

- `claim_journal_entries!` only claims entries whose `ship_id IS NULL OR ship_id NOT IN (approved_ship_ids)`.
- **Entries on an approved ship are immutable** — they belong to that finalized cycle. The new ship cannot reclaim them.
- Entries on returned/rejected ships ARE reclaimed (their `ship_id` is overwritten).

### `previous_approved_ship` and Cycle Boundaries

- `previous_approved_ship` = the project's most-recent `approved` ship strictly before the current ship's `created_at`.
- `new_journal_entries` = kept entries created after that cutoff (or all kept entries if no prior approved ship).
- `previous_journal_entries` = kept entries created at-or-before the cutoff.
- Reviewers see both `new_entries` and `previous_entries` in their UI (previous shown for context only).

### TA Annotation Carry-forward

See `carry_forward_ta_annotations!` above (Section 2). The key win: a re-ship where the user only added images/text but no new recordings → TA auto-approves and the user only waits for RC + Phase 2.

### Multiple Re-ships in Quick Succession

If a user submits ship A, gets returned, fixes, submits ship B → ship A is in terminal `returned` state (still has its history). Ship B claims entries from after the previous-**approved** cutoff (which is unchanged because A was returned, not approved). Both A and B coexist in the DB as separate rows — A's reviews stay in their terminal states forever as audit trail.

---

## 8. Notifications

`MailDeliveryService.ship_status_changed(ship)` (called by Ship's `after_update_commit`) creates an in-app `MailMessage`:
- `approved` → "Your ship for X was approved!" (+ feedback if present), action_url to project.
- `returned` → "Your ship for X was returned. Your submission needs changes." (+ aggregated feedback), action_url to project.
- `rejected` → "Your ship for X was not accepted." (+ feedback). No action_url (terminal).

The `notify_status_change` callback is wrapped in `rescue => e` and logs but doesn't re-raise — a notification failure shouldn't roll back the review decision.

---

## 9. Koi Economy

### Currency Surface

Three currencies referenced in code:
- **koi** — earned (intended via ship review), spent on shop items + project grants. The "main" currency.
- **gold** — premium currency, only ever credited via `admin_adjustment`. Spent on `currency = "gold"` shop items.
- **hours** — pseudo-currency on shop items. Cannot be purchased directly (`ShopOrder#user_can_afford` errors with "This item cannot be purchased directly"). Likely a placeholder for hours-redeemable rewards.

### Models

`KoiTransaction` (`app/models/koi_transaction.rb`):
- `user_id`, `actor_id` (nullable — nil for system-generated awards), `amount` (signed integer, validated `other_than: 0`), `reason` (string, must be one of `REASONS = %w[ship_review admin_adjustment streak_goal]`), `description` (text, required).
- **Readonly after creation**: `before_update { raise ActiveRecord::ReadonlyRecord }` and same for destroy. Records are the canonical history — never mutated.
- Has `user_id, created_at` composite index for fast per-user history queries.

`GoldTransaction` (`app/models/gold_transaction.rb`):
- Identical structure to KoiTransaction, but `REASONS = %w[admin_adjustment]` only. No system-generated source. Same readonly enforcement.

### Balance Calculation (`User#koi`, `User#gold`)

```ruby
def koi
  return 0 if trial?
  koi_transactions.sum(:amount) -
    shop_orders.joins(:shop_item).where(shop_items: { currency: "koi" })
               .where.not(state: :rejected).sum("frozen_price * quantity") -
    project_grant_orders.kept.where.not(state: :rejected).sum(:frozen_koi_amount)
end
```

Balance = sum of ledger amounts MINUS reservations from non-rejected shop orders MINUS reservations from non-rejected project grant orders (both koi-currency only).

`gold` is the same minus the project-grant-orders term and filtering shop orders by `currency: "gold"`.

**Trial users always have 0** — they cannot earn or spend.

**Why exclude only `rejected`** (not also `pending`):
- A `pending` shop order or project grant withholds koi from the user's spendable balance. They cannot double-spend while waiting on admin fulfillment.
- A `fulfilled` order remains in the deduction (cost was paid).
- A `rejected` order refunds — excluded from deduction → user gets balance back.
- A `fulfilled → rejected` transition (e.g., admin reverses a fulfilled grant) refunds koi to the user via this calculation. **It does NOT automatically claw back HCB money** (per a comment in `ProjectGrantOrder`) — that's manual reconciliation through the admin "Record adjustment" flow.

### Awarding Sources

| Reason | Created by | Notes |
|---|---|---|
| `streak_goal` | `StreakService.check_goal_completion` | `GOAL_KOI_REWARDS = { 3 => 1, 5 => 2, 7 => 5, 14 => 12 }` |
| `admin_adjustment` | `Admin::KoiTransactionsController#create` | Hard-coded `reason = "admin_adjustment"`; `actor` set to `current_user`. Admin-only via `before_action :require_admin!`. |
| `ship_review` | **Not currently created anywhere** ⚠️ | See gap below |

### ⚠️ Koi Awarding Gap

`KoiTransaction::REASONS` includes `"ship_review"`, and `DesignReview`/`BuildReview` both have a `koi_adjustment` integer column that admin reviewers fill in. The review controllers permit `:koi_adjustment` in `review_params`. But **no callback or service translates `koi_adjustment` into a `KoiTransaction`**. Searched for `KoiTransaction.create` and only `streak_service.rb:162` and `admin/koi_transactions_controller.rb:27` show up.

Implication: setting `koi_adjustment` on a Phase 2 review currently has no effect on the user's koi balance. Either (a) the wiring is intentionally deferred and a future hook (e.g., `Ship#after_approval` or a service object) will create the transaction, or (b) it's an in-progress migration.

If implementing this: a `Ship` after_update callback on `saved_change_to_status? && approved?` should iterate `[design_review, build_review].compact` and create one `KoiTransaction` per non-zero `koi_adjustment` with `reason: "ship_review"`, `actor: review.reviewer`, `description` referencing the project + cycle. Idempotency matters — re-firing on idempotent updates (e.g., `update_columns` from `sync_approved_seconds_from_ta!`) must not double-credit. Check `saved_change_to_status?` specifically (only fires on actual transition).

### Where Balance Is Surfaced

- `Path` header: `current_user.koi` (from `path_controller.rb#index`).
- `/shop` index: `koi_balance: current_user.koi` (from `shop_items_controller.rb`).
- Project grants: `koi_balance: current_user.koi` on the new/index pages.
- Shop order new: balance shown in the chosen currency (`gold` if item is gold-priced, else koi).
- Admin pages: `/admin/koi_transactions` (per-user filterable history), `/admin/koi_transactions/new` (manual adjustment form).
- API: `/api/v1/users/me` includes `koi: user.koi`.

### Spending: Shop Orders

`ShopOrder` (`app/models/shop_order.rb`):
- `frozen_price` snapshotted from `shop_item.price` on create (so price changes don't retroactively affect orders).
- `state` enum: `pending`, `fulfilled`, `rejected`, `on_hold`.
- `before_validation :freeze_price, on: :create`.
- `validate :user_can_afford, on: :create` — checks the right currency balance.
- Encrypts `phone` and `address` (PII of minors) at rest, non-deterministic.
- `requires_shipping` items require `address` + `phone` validation.

### Spending: Project Grants

`ProjectGrantOrder` (`app/models/project_grant_order.rb`) — the koi → real USD path via HCB.
- User specifies `frozen_usd_cents`; `before_validation :snapshot_koi_cost_from_usd` derives `frozen_koi_amount` from `HcbGrantSetting.current.koi_for_usd_cents(usd_cents)` (rounded UP — user pays the ceiling).
- `HcbGrantSetting` stores `koi_to_cents_numerator` (default 500) / `koi_to_cents_denominator` (default 7) → 7 koi = $5 = 500 cents (so 1 koi ≈ $0.71).
- Soft-deletable (`include Discardable`).
- States mirror `ShopOrder`: pending, fulfilled, rejected, on_hold.
- **Cannot be hard-destroyed** — `destroy` raises. Financial data preserved.
- Trial users blocked at validation level.
- `fulfilled → rejected` transition allowed and refunds koi (via the `where.not(state: :rejected)` exclusion in `User#koi`).

### Trial-user Suppression

Both `User#koi` and `User#gold` short-circuit to `0` for trial users. `ShopOrder#user_can_afford` short-circuits if `user.trial?` because trial users are blocked at the policy layer (`ShopOrderPolicy` requires `!user.trial? && user.fully_identity_gated? && Flipper.enabled?(:shop, user)`).

---

## 10. Concurrency & Safety Edge Cases

| Risk | Mitigation |
|---|---|
| Two reviewers grabbing the same review | `atomic_claim!` single-UPDATE WHERE guard returns true on success only |
| Reviewer's claim expiring mid-edit | Frontend heartbeat every <5min; if returns 409, edit fails policy check (no active claim) |
| Stale data on review save | `lock_version` optimistic locking on each Reviewable |
| Ship status drift if review status saved but ship not recomputed | `after_save` (not after_commit) `recompute_ship_status!` runs in same transaction |
| Phase 2 review created twice | `validates :ship_id, uniqueness: true` per-review-type; `find_or_create_by!` in `ensure_phase_two_review!` |
| TA approved but ship still pending | `recompute_status!` wraps `ship.with_lock { ensure_phase_two_review!; recompute_status! }` — both happen atomically |
| User submits twice rapidly | `ProjectPolicy#ship?` blocks while a `pending`/`awaiting_identity` ship exists |
| Preflight job spam | `#run` cancels existing running PreflightRuns before creating a new one |
| Identity gate flapping | Promotion is one-way; `clear_hca_session!` does not demote |
| Project flag mid-review | `available_for` excludes flagged ships from queues; `*ReviewPolicy#show?` blocks non-admin view |
| Admin overriding terminal status | `Ship#status_transition_allowed` model validation prevents it; `ShipPolicy#update?` is `admin?` only but the validation still fires |
| YouTube stretch_multiplier race with hours aggregation | TA annotation is the source of truth; `sync_youtube_stretch_multipliers!` runs before `sync_approved_seconds_from_ta!` so aggregation queries see the right value |
| Notification failure rolling back review | `notify_status_change` rescues all exceptions and logs; review save commits regardless |

---

## 11. Frontend Pages (Reviewer)

| Path | Purpose |
|---|---|
| `pages/admin/reviews/time_audits/{index,show}.tsx` | TA queue + review UI with timeline + segment annotation |
| `pages/admin/reviews/requirements_checks/{index,show}.tsx` | RC queue + repo tree viewer + Gerber renderer |
| `pages/admin/reviews/design_reviews/show.tsx` | DR queue (Phase 2 design ships) |
| `pages/admin/reviews/build_reviews/show.tsx` | BR queue (Phase 2 build ships) |
| `pages/admin/koi_transactions/{index,new}.tsx` | Admin koi ledger + manual adjustment form |

Each show page polls heartbeat and listens for 409 to surface "claim lost" UX.

---

## 12. Open Questions / Watch Items

- **Ship-review koi awarding** is not implemented — `koi_adjustment` is captured but never converted to a `KoiTransaction`. Confirm whether this is intentional (deferred) or a gap before relying on it.
- **`ship_type` is always `design`** by default; no UI flow currently sets `build`. If/when build-type ships are introduced, the submission form needs a selector and the routing needs to handle both.
- **Awaiting-identity ships** create no reviews and are invisible to reviewers — but they DO count toward `ProjectPolicy#ship?`'s "pending submission" lock. The user can't ship a different project if they have an awaiting-identity submission on another (intentional? worth confirming).
- The `feedback` text on a `returned` ship is **a snapshot at the moment of return**. If a reviewer later changes their mind and reopens (which they can't — terminal), the message wouldn't update. Consider this when reading old MailMessages.

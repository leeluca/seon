# Seon — Product vision

> Working document from design brainstorms begun on 2026-07-19 and revised
> on 2026-08-08. This describes the current direction, not a permanent product
> specification. Candidate decisions and unresolved questions are called out
> explicitly.

## Vision

Every goal is a line climbing toward something. Each day you add one small
point, watch the line grow, and the app tells you what today's bit needs to
be. Seon (선, "line") is the metaphor: the product shows trajectory, not a
list of obligations.

Long-term goals feel abstract; Seon's job is to connect them to a realistic
plan for this year, this month, and today. Logging should feel like building
something. Planning should feel like choosing a new slope, not negotiating
with past failures.

## Principles

1. **Progress accumulates.** A missed day slows the line; it never erases
   what was already built. No streak resets, no "streak: 0", and no
   broken-chain imagery. Consistency is shown as a rolling rate ("24 of the
   last 30 days") and an indestructible all-time total. Streaks appear only
   as celebration, while alive and notable.
2. **Facts + agency, never judgment.** Being behind is a state, not a
   failure. State the facts and attach a path forward: _"3 days behind pace.
   Finishing by Aug 30 now takes 14/day — or move the date to Sep 8."_ Actual
   progress remains visible; plans can change without rewriting history. No
   red for "behind".
3. **Goals express direction; plans express commitment in time.** A goal can
   survive for years. Annual and monthly plans choose which goals matter now
   and how much progress to pursue during a period.
4. **One goal language, multiple ways to progress.** The UI calls everything
   a goal. A goal is either tracked directly through entries or represented
   by smaller child goals. Directly tracked goals form a spectrum based on
   how much the user has promised; there is no habit/goal type picker.
5. **Two rituals, adapted to every screen.** Today is optimized for fast,
   focused logging. Planning and review provide broader context and
   deliberate choices. Mobile presents planning as a guided sequence;
   larger screens make comparison and bulk adjustment easier. The daily
   surface stays flat even when the goal structure is hierarchical.

## The product model

Seon has three core concepts:

- **Goal:** durable direction and, optionally, measurable progress.
- **Plan:** a revisable intention for a bounded period such as a year or a
  month.
- **Entry:** a dated fact recording what actually happened.

Goals answer _what and why_. Plans answer _what now_. Entries answer _what
happened_.

### Goals and children

The current direction is one level of nesting: a long-term goal can contain
the directly tracked goals that serve it.

```text
Learn Japanese                         ← progress comes from children
├── Learn 2,000 kanji                  ← directly tracked count
├── Complete N4 grammar                ← directly tracked count
└── Practice listening                 ← directly tracked practice
```

"Ambition" may be useful as an internal design term for a large qualitative
goal, but it is not a separate user-facing taxonomy. The UI calls the parent
and its children goals.

A goal has one progress source:

- **Direct:** progress comes from entries logged against the goal.
- **Children:** progress is described by the state of its children.

For the initial nested model, a parent does not also accept direct entries.
Mixing direct and child-derived progress makes it unclear whether the same
work has been counted twice. Children are ordinary directly tracked goals.

One parent per goal is enough for the current direction. Tags and filters can
provide cross-cutting organization without turning the hierarchy into a
general-purpose graph.

### The direct-goal spectrum

Directly tracked goals share one visual and interaction language:

| Shape | User promised | Primary stat |
| --- | --- | --- |
| Practice | Show up | Consistency + all-time total |
| Dateless target | Reach an amount | Percent + projected finish |
| Paced target | Reach an amount by a date | Pace + today's suggested amount |

The shape follows from the promise rather than a habit/goal picker:

1. "What do you want to work on?"
2. "How will you make progress?" — track it directly or break it into
   smaller goals.
3. For direct tracking: "Want to set a target?" — optional amount and unit.
4. "By when?" — optional date.

The word "habit" can still appear in onboarding and marketing ("habits and
goals"), but it need not become a permanent data-model category.

### Plans and planning horizons

Calendar periods are plans, not parent goals. `2026` does not sit above
`Learn Japanese` in the goal tree; it selects goals from the durable tree and
states what progress is intended during 2026.

```text
Goal tree
Learn Japanese
├── Learn 2,000 kanji
├── Complete N4 grammar
└── Practice listening

2026 plan
├── +900 kanji
├── Complete N4 grammar
└── 150 listening days

August plan
├── +100 kanji
├── +30 grammar points
└── 20 listening days
```

This lets a long-term goal continue across many years while its surrounding
plan changes every month. It also preserves the difference between an
ultimate target ("learn 2,000 kanji") and a period contribution ("add 100 in
August").

Adding a goal to a plan should use progressive disclosure:

1. Select it as a focus for the period.
2. Optionally set a target contribution or end-of-period value.
3. Optionally adjust its cadence for that period.

A focus-only plan item remains useful. When no period amount is set, Seon can
fall back to the goal's longer-term pace or cadence.

When several horizons provide a pace, the shortest active horizon is the
current working plan:

1. Monthly plan
2. Annual plan
3. Goal's ultimate target and date
4. Goal's default cadence

At the end of a period, actual progress remains unchanged and the plan closes
with the amount actually achieved. Unfinished work does not become automatic
debt. Seon may offer to carry the remainder into the next plan, but the user
must choose it explicitly.

### Entries are facts

Entries are the source of truth for directly tracked progress. They are dated
events, not editable progress snapshots. Changing a plan, target, or date
does not rewrite them.

- Count-like goals add entry values to an accumulated total.
- Practice goals add a simple show-up entry, normally `value: 1`.
- A total-reading mode may support monotonically advancing values such as a
  book page or course position, but variable real-world measurements require
  separate product consideration.

Backfilled or corrected entries honestly recompute the line, rolling rate,
pace, and plan results.

## Core workflow

### Long-term direction

The user creates a durable goal and optionally breaks it into smaller,
directly tracked goals. The hierarchy describes purpose and decomposition,
not calendar organization.

### Annual planning

The user looks across the goal tree, chooses what matters this year, and can
set annual contributions. Future years can be drafted without moving or
duplicating the underlying goals.

### Monthly planning and review

At the start of a month, the user selects a realistic subset of directly
tracked goals and optionally sets monthly contributions or cadence. At the
end of the month, Seon compares planned and actual progress and helps the
user form the next plan.

On mobile, review and planning proceed one goal at a time: show the previous
plan and actual result, then offer to keep, adjust, or pause the goal for the
next period. A final summary lets the user review the whole plan before
starting it. Larger screens can show the same workflow with more goals and
comparisons visible at once.

Re-planning is explicit and guilt-free. The previous plan remains a factual
record of what was intended and what happened; it is not silently mutated
into the new plan.

### Daily action

The current monthly plan is flattened into today's numbers. The user does
not navigate the hierarchy or manage the plan while logging.

## Surfaces

- **Today (mobile-primary).** A flat list of directly tracked goals that are
  active in the current plan. Practice goals use one-tap completion;
  quantitative goals use a small number input or stepper informed by the
  shortest active planning horizon. Logging is the reward moment: the line
  visibly ticks up on save.
- **Roadmap.** The durable goal tree together with annual visibility,
  available on every screen. Parent goals orient the user; child goals show
  concrete progress. Mobile uses collapsible branches and focused summaries;
  larger screens can expose more of the tree at once. A parent does not show
  a synthetic percentage across incompatible units. Prefer a summary such as
  "3 active · 1 on pace · 1 behind · 1 practice" and the current plan's most
  important highlights.
- **Plan and review.** Annual selection, monthly allocation,
  planned-versus-actual review, and re-planning are available on every
  screen. Mobile uses a guided, one-goal-at-a-time flow followed by a plan
  summary. Larger screens support comparison and bulk adjustment. Planning
  acts on the goal tree; the resulting daily work remains flat.
- **Goal detail.** The full line chart, entry history, plan history,
  re-planning controls, archive action, and advanced options. Tapping a goal
  from Roadmap opens detail. Today rows remain safe for fast logging; detail
  is reached through a secondary action.

## Logging and backfill

- Today logs **today, period**. The primary ritual does not expose a date
  field to serve an uncommon backfill case.
- "Log another day" lives behind a secondary gesture such as long-press or
  the row's menu. It defaults to yesterday and may offer recent-day chips.
  Copy says "log another day", never "missed days".
- Full history editing lives in Goal detail.
- Seon never proactively prompts the user to catch up on an unlogged day.
  Backfill is effortless when requested and never opened on the user's
  behalf.

## Current product boundaries

Seon is a goal and progress system, not a general task manager.

### In the current direction

- Direct practices, dateless targets, and paced targets
- One level of goal nesting
- Annual and monthly planning horizons
- Optional, lightweight tags and filters
- Dated entry history and guilt-free re-planning
- Additive counts, show-up entries, and accumulated progress toward a target

### Deliberately out of scope for now

- Ordinary one-off tasks and an inbox
- Task priorities, blockers, dependencies, assignees, and recurrence rules
- Arbitrarily deep goal trees
- Multiple goal parents or graph-like relationships
- Manual weighting and blended percentages for parent goals
- Automatically carrying unfinished plan amounts forward
- Measurements whose meaning depends on rising and falling values, limits,
  or ranges (for example weight, mood, or screen time)

A lightweight free-text "next step" may eventually help turn a goal into an
immediate action without introducing task states or a task-management
workflow.

## Candidate schema implications

These are modeling notes, not a migration plan.

```text
goal
  id
  parentId?                 // one level initially
  title
  description?
  progressSource            // DIRECT | CHILDREN
  loggingMode?              // COUNT | TOTAL | BOOLEAN; direct goals only
  target?
  unit?
  targetDate?
  cadence?
  completionDate?
  archivedAt?

plan
  id
  label
  period                    // YEAR | MONTH in the initial product
  startDate
  endDate
  closedAt?

planItem
  planId
  goalId                    // normally a directly tracked goal
  targetDelta?
  periodTarget?
  cadenceOverride?

entry
  id
  goalId
  value
  date
```

Important consequences:

- `goal.target` and `goal.targetDate` become nullable.
- The old `goal.type` concept should be separated into how progress is
  sourced (`DIRECT` or `CHILDREN`) and, for direct goals, how an entry is
  interpreted.
- A plan item is not a duplicate goal. It is a time-scoped intention that
  points to a durable goal.
- Plan results are derived from entries within the period rather than stored
  as manually edited progress.
- Schema work must account for the local-first database, server schema,
  synchronization allowlists, and existing user data. No migration should
  begin until the behaviors below are resolved.

## Open questions

### Planning semantics

- Are annual and monthly plans primarily focus lists, numeric commitments,
  or equally useful as both? The current direction supports focus first and
  an optional numeric promise.
- Should a monthly plan specify a contribution (`+100`) or an end value
  (`reach 650`), or allow both with one canonical stored representation?
- Are closed plans immutable, or can the user correct the stated intention
  later? Entry corrections must remain possible either way.
- Should months be explicitly connected to an annual plan, or is their
  relationship derived from dates?

### Goal semantics

- How does the user mark a child-derived parent goal as achieved? Candidate:
  explicit user action informed by, but not automatically determined from,
  its children.
- Can a directly tracked goal later become a child-derived goal, and what
  happens to its existing entries?
- Is one level of nesting sufficient for the first real use cases, or do
  realistic examples reveal a need for another level?
- Should tags ship with planning, or wait until the goal tree and plans are
  proven insufficient for finding and grouping goals?

### Daily interaction

- Should a quantitative input open prefilled with the suggested amount or
  empty?
- How should a focus-only monthly plan influence Today when the underlying
  goal has no target, date, or cadence?
- Weekly-quota cadence (for example, three times per week) remains a strong
  follow-up because it prevents weekend guilt and gives consistency a fair
  denominator.

### Boundaries and emotional design

- What should finishing a directly tracked goal or achieving a parent goal
  feel like?
- Should Seon ever support non-monotonic measurements, or should users
  reframe them as accumulating evidence (for example, "days under four hours
  of screen time")?
- Notifications, if added, should be an opt-in daily nudge at a chosen time,
  never a streak-loss warning.

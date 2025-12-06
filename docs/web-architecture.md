# Web Architecture (Frontend)

Defines the target structure for the web app with a local-first, feature-first layout and a clearer data boundary.

## Principles

- Local-first first: client DB is source of truth; sync is optional and recoverable.
- Feature-first ownership: UI, routes, hooks, and feature logic live together.
- Separation of concerns: data/domain is side-effect free; UI handles toasts/navigation.
- Explicit public surfaces: barrels only export what is meant to be shared.
- Sync awareness: data layer models offline/queued/syncing/conflict states.

## Target Directory Layout (packages/web/src)

```
packages/web/src/

├── app/                              # App shell: providers, router config, root layout
│
├── data/                             # Data infrastructure layer
│   ├── db/                           # AppSchema, db factory, migrations/versioning
│   ├── sync/                         # PowerSync connector, auth wiring, sync state
│   └── domain/                       # Goal/Entry/User domain/data access (pure, typed)
│
├── features/                         # Domain feature modules
│   ├── goal/
│   │   ├── routes/                   # Feature-owned pages + loaders/actions/guards
│   │   ├── components/               # Feature UI pieces (cards, panels, filters)
│   │   ├── hooks/                    # Feature hooks wrapping domain/query
│   │   ├── model/                    # Types, validation, mappers
│   │   └── index.ts                  # Public exports for the feature
│   ├── entry/
│   └── auth/
│
├── shared/                           # Cross-cutting reusable modules
│   ├── components/
│   │   ├── common/                   # Presentational pieces (AppLink, BackButton, ContentCard)
│   │   ├── ui/                       # Design-system primitives (shadcn/Radix-based)
│   │   └── providers/                # App-wide providers (QueryProvider, I18nProvider)
│   ├── utils/                        # Cross-cutting helpers
│   ├── hooks/                        # Generic hooks (debounce, timeout, etc.)
│   └── constants/                    # Cross-feature constants
```

## Layer Responsibilities

- `app/`: composition only (providers, router, global error boundaries).
- `data/`: infrastructure; owns PowerSync/Kysely setup, migrations, sync orchestration, and domain/data access; no UI side effects.
- `features/*`: end-user behavior; routes + UI + feature hooks + validation; imports repositories via feature hooks.
- `shared/`: reusable primitives that have no feature knowledge.

## Data Layer Details

- `db/`: `AppSchema`, indexes, client migrations/version checks, Kysely wrapper.
- `sync/`: PowerSync connector, token management, retry/backoff, sync-state events.
- `domain/`: pure data access + domain logic (e.g., `recordEntry`, `recomputeProgress`); return data/Result, not toasts or navigation; suitable for unit tests and offline-first flows.

## Feature Module Anatomy (example: goal)

- `routes/` own goal pages and load data via feature hooks. The file-based TanStack router still uses `src/routes/*` as entrypoints; those files should be thin adapters that import the feature-owned page/loader/guards from `features/goal/routes/*` and re-export them.
- `hooks/` translate domain operations into TanStack Query mutations/queries and wire UI concerns (toasts, navigation, invalidations).
- `components/` contains feature-specific components only used by goal.
- `model/` holds types, validation, constants, and mappers to/from repository DTOs.
- `index.ts` re-exports the public surface (e.g., route loaders, top-level UI) explicitly.

## Component Structure Guidelines

- **Single file**: Use for small, self-contained components (<150–200 lines, one UI concern). Co-locate tests/stories next to it.
- **Directory**: Use when the component has multiple internal parts, custom hooks, dedicated constants, or multiple entry points.

```
Component/

├── Component.tsx                     # main export
├── Component.test.tsx                # component tests
├── useComponent.ts                   # component-only hook (optional)
├── constants.ts                      # component constants
├── types.ts                          # component types
├── parts/                            # internal subcomponents
│   ├── Header.tsx
│   └── ItemRow.tsx
└── index.ts                          # re-export main + public subparts
```

- Keep only the public surface in `index.ts`; internal pieces stay unexported or in `parts/`.
- **Feature vs. shared**: Feature-specific components live in `features/<feature>/components/`; cross-feature reusable pieces live in `shared/components/common/` or `ui/`.

## Barrel (`index.ts`) Guidance

- Prefer one barrel per feature root; export only what other features/routes need.
- Avoid `export *`; use named exports to keep tree-shaking effective.
- Keep barrels side-effect free to avoid accidental bundle impact.
- Import internal files within a feature via relative paths; cross-feature imports go through the barrel.

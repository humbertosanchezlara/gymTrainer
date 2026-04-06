# FitApp — Claude Code Project Instructions

## Project Overview
React 19 + TypeScript + Vite 8 SPA. Smart personal trainer that generates evidence-based 12-week periodized programs. Backend: Supabase (PostgreSQL + Auth + RLS). Styling: Tailwind CSS 4 + Framer Motion 12. All UI text is in **Spanish**.

## Tech Stack
- **Runtime**: Node v22 via nvm (`~/.nvm/versions/node/v22.22.2/bin/node`)
- **Build**: `node node_modules/.bin/vite` (not npx — nvm shebang issue)
- **Type check**: `node <project-root>/node_modules/.bin/tsc --noEmit --project tsconfig.app.json`
- **Lint**: `node node_modules/.bin/eslint src/`
- **Dev server**: port 5173

## Architecture (key files)
| File | Responsibility |
|---|---|
| `src/components/MainShell.tsx` | All main views: Dashboard, Session, Library (Ajustes), Progress |
| `src/components/OnboardingWizard.tsx` | Onboarding flow (profile, BMI, gender, key lifts) |
| `src/components/ProgramView.tsx` | Read-only program display (12-week periodization) |
| `src/engine/programGenerator.ts` | Program generation engine (BMI, gender, duration scaling) |
| `src/engine/splitTemplates.ts` | Day templates per split (2-6 days) |
| `src/engine/weightEstimator.ts` | BW-relative weight estimation with gender scaling |
| `src/types.ts` | Types + DEFAULT_EXERCISES (Spanish names) |
| `src/context/AuthContext.tsx` | Supabase auth wrapper |
| `schema.sql` | Full DB schema reference |

## Critical Conventions

### Exercise names are in Spanish
`DEFAULT_EXERCISES`, `splitTemplates`, `weightEstimator`, and all DB rows use **Spanish** names (e.g. "Barra Press de Banca", not "Barbell Bench Press"). Any new exercise must follow this convention.

### Periodization blocks
4 blocks: Volumen (wk 1-4), Intensidad (wk 5-8), Pico (wk 9-11), Descarga (wk 12).

### Git workflow
- Worktree at `.claude/worktrees/fervent-babbage` — use `GIT_DIR` + `GIT_WORK_TREE` env vars for git commands
- Branch: `claude/fervent-babbage`
- PRs to `main` via `gh pr create` then `gh pr merge`
- gh binary at `/opt/homebrew/bin/gh`

## Coding Guidelines
- **Read before edit**: Always read the target file/section before modifying
- **Targeted edits**: Use Edit tool with minimal context — never rewrite entire files
- **Read with offset+limit**: For files >200 lines, read only the relevant section
- **Type check after edits**: Run tsc after changes to catch errors before committing
- **No English in UI**: All user-facing strings must be in Spanish
- **Unused variable = build failure**: TypeScript strict mode is on; remove unused imports/variables
- **Supabase queries**: Always use `.eq('user_id', user.id)` for RLS safety
- **Weight rounding**: All weights round to nearest 2.5 kg: `Math.round(w / 2.5) * 2.5`

## Common Patterns
```typescript
// Supabase query
const { data } = await supabase.from('table').select('*').eq('user_id', user.id).single();

// Animation wrapper
<motion.div variants={fadeUp} className="card-elevated rounded-xl p-6">

// Editable input style
className="bg-white dark:bg-white/10 border border-outline-variant/30 rounded-lg ..."

// Read-only display
className="text-on-surface font-headline font-bold"
```

## Environment
- `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (never commit)
- Supabase project: `jlpsuvryaohinbgqltxv`

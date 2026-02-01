# btl.run Documentation

Organized documentation for btl.run development and operations.

## Folder Structure

```
docs/
├── README.md            # This file
├── guides/              # Living operational guides (keep current)
│   ├── README.md
│   └── ...
├── history/             # Historical session notes (dated snapshots)
│   ├── README.md
│   └── YYYY-MM-DD-description.md
└── spec/                # Game specification and design docs
    └── ...
```

## Documentation Types

### Root Documentation (Essential)

These live in the repository root:
- `README.md` - Project overview and quick start
- `ARCHITECTURE.md` - Technical architecture
- `SETUP.md` - Deployment instructions
- `INTEGRATION.md` - Service integration guide
- `DEPLOYMENT-CHECKLIST.md` - Pre-deployment verification
- `STATUS.md` - Current project status
- `Claude.md` - AI agent context
- `CHANGELOG.md` - Version history (when created)

**Keep these updated** as the primary source of truth.

### Living Guides (`docs/guides/`)

**Purpose:** Current, maintained how-to documentation

Create guides for:
- Deployment procedures
- Testing workflows
- Feature usage
- Development setup
- Troubleshooting

**Examples:**
- `quickstart.md` - 5-minute getting started
- `testing.md` - Running tests
- `game-mechanics.md` - How game systems work

**Maintenance:**
- Keep these current as system evolves
- Update when processes change
- Delete if no longer relevant

### Historical Notes (`docs/history/`)

**Purpose:** Dated snapshots of sessions and decisions

Create historical notes when:
- Completing a major implementation phase
- Making significant architectural decisions
- Finishing a milestone
- Documenting "why" behind non-obvious choices

**Format:**
- Filename: `YYYY-MM-DD-description.md`
- Length: 100-300 lines (concise)
- Style: Bullet points, not verbose paragraphs
- Content: Decisions and outcomes, not code walkthrough

**Examples:**
- `2026-01-30-infrastructure-setup.md`
- `2026-02-05-game-engine-implementation.md`

**Important:**
- These are historical snapshots - never update after creation
- Include date in filename for chronological sorting
- Add entry to `docs/history/README.md` timeline

### Game Specification (`docs/spec/`)

**Purpose:** Game rules, mechanics, and design decisions

Document:
- Game modes (Play, Host, Quick Play, Long Play)
- Entry flows (choice timing: deferred vs pre-selected)
- Combat/event mechanics
- Tribute stats and abilities
- Win/loss conditions
- Narrative structure

## Documentation Workflow

### When to Create New Documentation

```
Is it setup/deployment info?
  → Update SETUP.md or DEPLOYMENT-CHECKLIST.md

Is it architectural info?
  → Update ARCHITECTURE.md

Is it a how-to guide?
  → Create docs/guides/{topic}.md

Is it a major session/milestone?
  → Create docs/history/YYYY-MM-DD-{description}.md

Is it a version release?
  → Update CHANGELOG.md

Is it a technical debugging lesson?
  → Create .cursor/_lessons_learned/{category}/{name}.md

Is it game rules/mechanics?
  → Add to docs/spec/
```

### What NOT to Create

- ❌ Session summaries in root directory
- ❌ `STATUS_UPDATE.md`, `COMPLETION_NOTES.md`, etc.
- ❌ Duplicate information across multiple files
- ❌ Verbose code walkthroughs
- ❌ Temporary working notes

## Quality Standards

### Be Concise
- Focus on essential information
- Use bullet points for lists
- Link to code, don't duplicate it
- Target 100-300 lines for historical notes

### Be Organized
- One topic per file
- Clear section headings
- Logical information hierarchy
- Related info grouped together

### Be Current (for living docs)
- Update guides when processes change
- Remove obsolete information
- Keep examples working
- Verify links and paths

### Be Historical (for snapshots)
- Date all historical notes
- Don't update after creation
- Capture context and decisions
- Focus on "why" not "what"

## Integration with .cursor/ Folder

The `.cursor/` folder contains AI agent configuration:
- **agents/** - Specialized task agents
- **skills/** - Reusable how-to guides
- **rules/** - Always-applied coding standards
- **_lessons_learned/** - Technical debugging patterns

This `docs/` folder is for human-readable project documentation.

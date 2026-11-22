# Contributing

Each mod is a folder at the root of this repository and a plugin of its own. It must work when installed alone: Claude Code copies only the mod's folder, so nothing outside it reaches the mod.

## Layout of a mod

```
<mod>/
├── .claude-plugin/plugin.json   name, version, description, author, license
├── hooks/
│   ├── hooks.json               { "modules": ["./register.tsx"] }
│   └── register.tsx             export const register: Register = (on, options) => { ... }
├── types/index.d.ts             the $.state contract, when the mod keeps state
├── tests/*.test.tsx             claude plugin test
├── tsconfig.json                { "extends": "./.claude-plugin/types/tsconfig.json" }
├── README.md                    what it does, install, settings, requirements, status
└── CHANGELOG.md                 one entry per version
```

`.claude-plugin/types/` is written by Claude Code when it loads the mod and is not committed.

## Rules

1. The folder name, the `name` in `plugin.json` and the entry in `.claude-plugin/marketplace.json` match.
2. Prefix what the mod registers: state under the mod's own name, commands with a name that says which mod they belong to.
3. A theme mod says so in its README and in the catalog table: one theme at a time.
4. A version bump touches `plugin.json`, `CHANGELOG.md` and the README together. Tags carry the mod's name: `rasenshuriken-v0.2.0`.
5. Shared helpers live in `shared/` and are copied into each mod that uses them with `scripts/sync-shared.sh`. Never import from outside the mod's folder.

## Checks

Every push runs:

- the shared publishable-content scanner from [therogueroadmap/.github](https://github.com/therogueroadmap/.github);
- `scripts/sync-shared.sh --check`, which fails when a mod's copy of a shared helper is out of date;
- `claude plugin validate` and `claude plugin test` on every mod listed in the catalog.

Run them locally before opening a pull request:

```bash
scripts/sync-shared.sh --check
```

```bash
claude plugin validate rasenshuriken
```

```bash
claude plugin test rasenshuriken
```

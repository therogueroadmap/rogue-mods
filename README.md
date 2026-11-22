# The Rogue Roadmap — mods for Claude

> [English](#english) · [Español](#español) · [Français](#français)

## English

Mods change Claude's own interface: themes, backdrops, panels, rows above the prompt, commands. This repository is a catalog of mods; each folder is a plugin of its own, so you install only the ones you want.

### Install

```text
/plugin marketplace add therogueroadmap/rogue-mods
/plugin install <mod>@rogue-mods
```

In the desktop app: + next to the prompt box → Plugins → Add marketplace (`therogueroadmap/rogue-mods`) → Add plugin.

### Catalog

| Mod | Kind | Status |
|---|---|---|
| [`rasenshuriken`](rasenshuriken/) | Theme | In progress |

Use one **theme** at a time: the last theme set wins. Other mods (panels, rows, commands) combine freely.

### Requirements

- Claude Code with mod support (hooks modules). The mod API is early access and may change between releases.
- Themes and backdrops draw in the desktop and mobile apps; the terminal shows rows, status line entries and commands.

### Developing

Add your local clone as a marketplace and install from it: Claude Code then reads each mod straight from its folder, so an edit shows after `/reload-plugins`, with no publishing.

```text
/plugin marketplace add ./rogue-mods
/plugin install rasenshuriken@rogue-mods
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the layout of a mod and the checks.

## Español

Los mods cambian la propia interfaz de Claude: temas, fondos, paneles, bandas sobre el prompt, comandos. Este repositorio es un catálogo de mods; cada carpeta es un plugin independiente, así que instalas solo los que quieras. Usa un **tema** a la vez. La instalación, el catálogo y los requisitos están en la sección en inglés.

## Français

Les mods modifient l'interface de Claude : thèmes, arrière-plans, panneaux, bandeaux au-dessus du prompt, commandes. Ce dépôt est un catalogue de mods ; chaque dossier est un plugin indépendant, à installer séparément. Un seul **thème** à la fois. L'installation, le catalogue et les prérequis sont dans la section anglaise.

## License

MIT

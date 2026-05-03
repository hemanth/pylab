# pylabs

[![npm version](https://img.shields.io/npm/v/pylabs.svg)](https://www.npmjs.com/package/pylabs)
[![license](https://img.shields.io/npm/l/pylabs.svg)](https://github.com/hemanth/pylab/blob/main/LICENSE)

Create interactive browser-based Python codelabs from config + lesson files. Zero dependencies, zero build tools - just Node.js.

Powered by [Pyodide](https://pyodide.org/) (Python in WebAssembly) and [Monaco Editor](https://microsoft.github.io/monaco-editor/) (VS Code's editor).

## Install

```bash
npm install -g pylabs
```

Or use directly with `npx`:

```bash
npx pylabs init my-codelab
```

## Quick start

```bash
npx pylabs init my-codelab
cd my-codelab
npx pylabs build
npx pylabs serve
# → http://localhost:3000
```

## How it works

1. **Define lessons** as JS modules in `lessons/`
2. **Configure** your codelab in `pylab.config.js`
3. **Build** a static site with `pylabs build`
4. **Deploy** the `dist/` folder anywhere (GitHub Pages, Netlify, Vercel, etc.)

## Lesson format

Lessons can be written as **Markdown** (recommended) or **JS modules**.

### Markdown (recommended)

```md
---
id: hello-world
title: Hello World
---

Write your first Python program.

Python's `print()` function outputs text to the console.

## Code

\`\`\`python
print("Hello, World!")
\`\`\`

## Exercise

**Exercise:** Print your name.

## Hint

Use an f-string.

## Solution

\`\`\`python
name = "World"
print(f"Hello, {name}!")
\`\`\`
```

### JS module (alternative)

```js
// lessons/01-hello-world.js
export default {
  id: "hello-world",
  title: "Hello World",
  description: `Markdown description with \`code\` and **bold**.`,
  starterCode: `print("Hello, World!")`,
  exercise: "**Exercise:** Print your name.",
  hint: "Use an f-string.",
  solution: `name = "World"\nprint(f"Hello, {name}!")`,
};
```

## Config

```js
// pylab.config.js
export default {
  title: "My Python Codelab",
  subtitle: "Learn by doing",
  description: "Interactive Python lessons in your browser.",
  accent: "#2dd4bf",           // Primary accent color (CSS)
  badge: "interactive codelab",
  install: "pip install mylib", // Install banner (optional)
  github: "https://github.com/...",
  packages: ["sqlite3"],        // Pyodide packages to preload
  mocks: ["mocks/mylib.py"],    // Python mock modules
  congrats: {
    title: "Congratulations!",
    subtitle: "You completed all lessons.",
    stats: [
      { num: "10", label: "Lessons" },
      { num: "~30m", label: "Duration" },
    ],
  },
};
```

## Mock modules

Drop `.py` files in `mocks/` to simulate your library in the browser. They're loaded into Pyodide's virtual filesystem so students can `import mylib` without installing anything.

## CLI

| Command | Description |
|---------|-------------|
| `pylabs init [dir]` | Scaffold a new codelab project |
| `pylabs build [dir]` | Build static site to `dist/` |
| `pylabs serve [dir] [port]` | Local dev server (default: 3000) |

## Features

- **Monaco Editor** with Python syntax highlighting and custom dark theme
- **Pyodide runtime** - real Python 3.x in the browser via WebAssembly
- **Progress tracking** persisted to localStorage
- **Lesson search** and sidebar navigation
- **Mobile responsive** with slide-out drawer and compact topbar
- **Completion overlay** with customizable stats
- **Custom accent colors** - one config change themes everything
- **OG/Twitter meta tags** for social sharing
- **Custom mock modules** - simulate any Python library
- **Zero runtime dependencies** - output is pure static HTML/CSS/JS

## Example

[agentu codelab](https://hemanth.github.io/agentu-codelab/) was built with pylabs.

## License

MIT

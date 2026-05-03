# pylab

Create interactive browser-based Python codelabs from config + lesson files. Zero dependencies, zero build tools - just Node.js.

Powered by [Pyodide](https://pyodide.org/) (Python in WebAssembly) and [Monaco Editor](https://microsoft.github.io/monaco-editor/) (VS Code's editor).

## Quick start

```bash
npx pylab init my-codelab
cd my-codelab
npx pylab build
npx pylab serve
```

## How it works

1. **Define lessons** as JS modules in `lessons/`
2. **Configure** your codelab in `pylab.config.js`
3. **Build** to a static site with `pylab build`
4. **Deploy** the `dist/` folder anywhere (GitHub Pages, Netlify, etc.)

## Lesson format

Each lesson is a JS file exporting a default object:

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

Files are auto-sorted by filename prefix (`01-`, `02-`, etc.).

## Config

```js
// pylab.config.js
export default {
  title: "My Python Codelab",
  subtitle: "Learn by doing",
  description: "Interactive Python lessons in your browser.",
  accent: "#2dd4bf",          // Primary accent color (CSS)
  badge: "interactive codelab",
  install: "pip install mylib", // Install banner (optional)
  github: "https://github.com/...",
  packages: ["sqlite3"],       // Pyodide packages to preload
  mocks: ["mocks/mylib.py"],   // Python mock modules
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
| `pylab init [dir]` | Scaffold a new codelab project |
| `pylab build [dir]` | Build static site to `dist/` |
| `pylab serve [dir]` | Local dev server |

## Features

- Monaco editor with Python syntax highlighting
- Pyodide runtime - real Python in the browser
- Progress tracking (localStorage)
- Lesson search and sidebar navigation
- Mobile responsive with slide-out drawer
- Completion overlay with stats
- Custom accent colors
- OG/Twitter meta tags
- Zero runtime dependencies

## License

MIT

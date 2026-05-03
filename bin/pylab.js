#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname, basename, resolve } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES = join(__dirname, "..", "templates");

const [, , command, ...args] = process.argv;

const HELP = `
  pylabs - create interactive Python codelabs

  Usage:
    pylabs init [dir]     Scaffold a new codelab project
    pylabs build [dir]    Build static site from config + lessons
    pylabs serve [dir]    Serve the built site locally

  Examples:
    npx pylabs init my-codelab
    cd my-codelab && npx pylabs build && npx pylabs serve
`;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

// ---------------------------------------------------------------------------
// Markdown lesson parser
// ---------------------------------------------------------------------------

function parseMarkdownLesson(content, filename) {
  // Parse YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    console.error(`  ✗ ${filename}: missing YAML frontmatter (---)`);  
    return null;
  }

  const frontmatter = {};
  for (const line of fmMatch[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      frontmatter[key] = val;
    }
  }

  const body = fmMatch[2];

  // Split body by ## headings
  const sections = {};
  let currentKey = "description";
  let currentLines = [];

  for (const line of body.split("\n")) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      // Save previous section
      sections[currentKey] = currentLines.join("\n").trim();
      currentLines = [];
      // Map heading to section key
      const heading = headingMatch[1].toLowerCase().trim();
      if (heading === "code" || heading === "starter" || heading === "starter code") {
        currentKey = "starterCode";
      } else if (heading === "exercise") {
        currentKey = "exercise";
      } else if (heading === "hint") {
        currentKey = "hint";
      } else if (heading === "solution") {
        currentKey = "solution";
      } else {
        currentKey = heading;
      }
    } else {
      currentLines.push(line);
    }
  }
  sections[currentKey] = currentLines.join("\n").trim();

  // Extract code from fenced blocks for starterCode and solution
  function extractCode(text) {
    const codeMatch = text.match(/```(?:\w*)?\n([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : text;
  }

  return {
    id: frontmatter.id || slugify(frontmatter.title || basename(filename, ".md")),
    title: frontmatter.title || basename(filename, ".md"),
    description: sections.description || "",
    starterCode: extractCode(sections.starterCode || ""),
    exercise: sections.exercise || "",
    hint: sections.hint || "",
    solution: extractCode(sections.solution || ""),
  };
}

// ---------------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------------

function cmdInit(targetDir) {
  const dir = resolve(targetDir || ".");
  mkdirSync(join(dir, "lessons"), { recursive: true });
  mkdirSync(join(dir, "mocks"), { recursive: true });

  // Config
  writeFileSync(
    join(dir, "pylab.config.js"),
    `export default {
  title: "My Python Codelab",
  subtitle: "Learn by doing",
  description: "Interactive Python lessons in your browser.",
  accent: "#2dd4bf",
  badge: "interactive codelab",
  install: "pip install my-library",
  github: "",
  packages: [],
  mocks: [],
  congrats: {
    title: "Congratulations!",
    subtitle: "You completed all lessons.",
    stats: [],
  },
};
`
  );

  // Example lesson (markdown)
  writeFileSync(
    join(dir, "lessons", "01-hello-world.md"),
    `---
id: hello-world
title: Hello World
---

Write your first Python program.

Python's \`print()\` function outputs text to the console.

## Code

\`\`\`python
# Welcome to Python!
print("Hello, World!")

name = "Codelab"
print(f"Welcome to {name}!")
\`\`\`

## Exercise

**Exercise:** Create a variable called \`greeting\` and print it with your name.

## Hint

Use an f-string: \`f"{greeting}, {name}!"\`

## Solution

\`\`\`python
greeting = "Hello"
name = "World"
print(f"{greeting}, {name}!")
\`\`\`
`
  );

  console.log(`✓ Initialized pylab project in ${dir}`);
  console.log(`\n  Next steps:`);
  console.log(`    1. Edit pylab.config.js`);
  console.log(`    2. Add lessons in lessons/`);
  console.log(`    3. Run: npx pylab build`);
  console.log(`    4. Run: npx pylab serve\n`);
}

// ---------------------------------------------------------------------------
// BUILD
// ---------------------------------------------------------------------------

async function cmdBuild(targetDir) {
  const dir = resolve(targetDir || ".");
  const configPath = join(dir, "pylab.config.js");

  if (!existsSync(configPath)) {
    console.error("✗ No pylab.config.js found. Run `pylab init` first.");
    process.exit(1);
  }

  const config = (await import(configPath)).default;
  const dist = join(dir, "dist");
  mkdirSync(dist, { recursive: true });

  console.log(`Building "${config.title}"...`);

  // 1. Collect lessons (.js and .md)
  const lessonsDir = join(dir, "lessons");
  const lessonFiles = readdirSync(lessonsDir)
    .filter((f) => f.endsWith(".js") || f.endsWith(".md"))
    .sort();

  const lessons = [];
  for (const file of lessonFiles) {
    if (file.endsWith(".md")) {
      const content = readFileSync(join(lessonsDir, file), "utf-8");
      const lesson = parseMarkdownLesson(content, file);
      if (lesson) lessons.push(lesson);
    } else {
      const mod = await import(join(lessonsDir, file));
      lessons.push(mod.default);
    }
  }

  console.log(`  Found ${lessons.length} lessons`);

  // 2. Generate lessons.js
  writeFileSync(
    join(dist, "lessons.js"),
    `export const lessons = ${JSON.stringify(lessons, null, 2)};\n`
  );

  // 3. Copy mock files
  const mocks = config.mocks || [];
  const mockEntries = [];
  for (const mockPath of mocks) {
    const fullPath = join(dir, mockPath);
    if (existsSync(fullPath)) {
      const name = basename(mockPath);
      copyFileSync(fullPath, join(dist, name));
      mockEntries.push(name);
      console.log(`  Copied mock: ${name}`);
    }
  }

  // Also copy any .py files from mocks/ dir not explicitly listed
  const mocksDir = join(dir, "mocks");
  if (existsSync(mocksDir)) {
    for (const f of readdirSync(mocksDir).filter((f) => f.endsWith(".py"))) {
      if (!mockEntries.includes(f)) {
        copyFileSync(join(mocksDir, f), join(dist, f));
        mockEntries.push(f);
        console.log(`  Copied mock: ${f}`);
      }
    }
  }

  // 4. Build config object for runtime
  const runtimeConfig = {
    title: config.title || "Python Codelab",
    subtitle: config.subtitle || "",
    accent: config.accent || "#2dd4bf",
    packages: config.packages || [],
    mocks: mockEntries,
    storageKey: slugify(config.title || "pylab") + "-completed",
    congrats: config.congrats || null,
  };

  // 5. Render index.html
  let html = readFileSync(join(TEMPLATES, "index.html"), "utf-8");

  // Feature cards from lessons
  const featureCards = lessons
    .map(
      (l, i) =>
        `<div class="feature-card" data-lesson="${i}"><h3>${l.title}</h3><p>${(l.description || "").split("\n")[0].replace(/[*`#]/g, "").trim().slice(0, 80)}</p></div>`
    )
    .join("\n        ");

  // Congrats stats
  const congratsStats = (config.congrats?.stats || [])
    .map((s) => `<div class="congrats-stat"><div class="congrats-stat-num">${s.num}</div><div class="congrats-stat-label">${s.label}</div></div>`)
    .join("\n");

  const replacements = {
    "{{TITLE}}": config.title || "Python Codelab",
    "{{SUBTITLE}}": config.subtitle || "",
    "{{DESCRIPTION}}": config.description || "",
    "{{BADGE}}": config.badge || "interactive codelab",
    "{{INSTALL}}": config.install || "",
    "{{GITHUB}}": config.github || "",
    "{{ACCENT}}": config.accent || "#2dd4bf",
    "{{FEATURE_CARDS}}": featureCards,
    "{{LESSON_COUNT}}": String(lessons.length),
    "{{OG_TITLE}}": `${config.title} - ${config.subtitle || "interactive codelab"}`,
    "{{OG_DESCRIPTION}}": config.description || "",
    "{{OG_IMAGE}}": config.ogImage || "",
    "{{OG_URL}}": config.url || "",
    "{{CONGRATS_TITLE}}": config.congrats?.title || "Congratulations!",
    "{{CONGRATS_SUBTITLE}}": config.congrats?.subtitle || "You completed all lessons.",
    "{{CONGRATS_STATS}}": congratsStats,
    "{{RUNTIME_CONFIG}}": JSON.stringify(runtimeConfig),
  };

  for (const [key, val] of Object.entries(replacements)) {
    html = html.replaceAll(key, val);
  }

  // Hide install banner if empty
  if (!config.install) {
    html = html.replace(/<code class="install-banner">.*?<\/code>/, "");
  }

  // Hide github link if empty
  if (!config.github) {
    html = html.replace(/<a[^>]*class="topbar-link"[^>]*>.*?<\/a>/s, "");
  }

  writeFileSync(join(dist, "index.html"), html);

  // 6. Copy static assets
  for (const file of ["style.css", "app.js", "favicon.svg"]) {
    copyFileSync(join(TEMPLATES, file), join(dist, file));
  }

  // Override accent color in CSS
  if (config.accent && config.accent !== "#2dd4bf") {
    let css = readFileSync(join(dist, "style.css"), "utf-8");
    css = css.replace(/--accent:\s*#2dd4bf/g, `--accent: ${config.accent}`);
    writeFileSync(join(dist, "style.css"), css);
  }

  // Copy user's OG image / favicon if present
  for (const asset of ["og.png", "favicon.svg", "favicon.ico"]) {
    const userAsset = join(dir, asset);
    if (existsSync(userAsset)) {
      copyFileSync(userAsset, join(dist, asset));
    }
  }

  console.log(`\n✓ Built to ${dist} (${lessons.length} lessons)\n`);
}

// ---------------------------------------------------------------------------
// SERVE
// ---------------------------------------------------------------------------

function cmdServe(targetDir) {
  const dir = resolve(targetDir || ".");
  const dist = join(dir, "dist");

  if (!existsSync(dist)) {
    console.error("✗ No dist/ folder found. Run `pylab build` first.");
    process.exit(1);
  }

  const MIME = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".py": "text/plain",
    ".ico": "image/x-icon",
  };

  const port = parseInt(args[0]) || 3000;

  const server = createServer((req, res) => {
    let url = req.url === "/" ? "/index.html" : req.url;
    url = url.split("?")[0];
    const filePath = join(dist, url);

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = "." + filePath.split(".").pop();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(readFileSync(filePath));
  });

  server.listen(port, () => {
    console.log(`\n  pylab dev server running at:`);
    console.log(`  → http://localhost:${port}\n`);
  });
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

switch (command) {
  case "init":
    cmdInit(args[0]);
    break;
  case "build":
    await cmdBuild(args[0]);
    break;
  case "serve":
    cmdServe(args[0]);
    break;
  default:
    console.log(HELP);
}

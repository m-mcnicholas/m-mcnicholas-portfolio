import { access, readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([".git", ".vite", "dist", "node_modules", "playwright-report", "test-results", "secret"]);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".yml"]);
const failures = [];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(root);
for (const file of files.filter((path) => textExtensions.has(extname(path)))) {
  const source = await readFile(file, "utf8");
  const relative = file.slice(root.length + 1);
  source.split("\n").forEach((line, index) => {
    if (/[ \t]+$/.test(line)) failures.push(`${relative}:${index + 1} has trailing whitespace`);
  });
  if (!source.endsWith("\n")) failures.push(`${relative} needs a final newline`);
  if (extname(file) !== ".html") continue;
  for (const [, reference] of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    if (/^(?:#|data:|https?:|mailto:|tel:|javascript:)/.test(reference)) continue;
    const pathname = reference.split(/[?#]/, 1)[0];
    if (!pathname) continue;
    try {
      await access(resolve(file, "..", pathname));
    } catch {
      failures.push(`${relative} links to missing local file ${reference}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log(`Checked whitespace and local links in ${files.length} repository files.`);

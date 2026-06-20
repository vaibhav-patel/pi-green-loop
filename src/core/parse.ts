import type { ParsedFailure, ParsedResult, TestFramework } from "./types.js";

/**
 * Extract failing test names (and a representative error line) from a check's raw output.
 *
 * Parses the framework's *default human output* — no JSON-reporter flags, plugins, or command
 * rewriting required (so it can't trip vitest's watch mode or conflict with a project's reporter
 * config). Returns `undefined` when nothing can be extracted, so callers fall back to raw output.
 * Purely presentational: it never affects pass/fail.
 */
export function parseFailures(framework: TestFramework | undefined, output: string): ParsedResult | undefined {
  if (!framework || !output) return undefined;
  const lines = output.split(/\r?\n/);
  let failures: ParsedFailure[];
  switch (framework) {
    case "go":
      failures = parseGo(lines);
      break;
    case "pytest":
      failures = parsePytest(lines);
      break;
    case "cargo":
      failures = parseCargo(lines);
      break;
    case "vitest":
    case "jest":
      failures = parseJsLike(lines);
      break;
    default:
      return undefined; // "make" wraps an unknown tool — keep raw
  }
  if (failures.length === 0) return undefined;
  return { failures, failed: failures.length };
}

function parseGo(lines: string[]): ParsedFailure[] {
  const out: ParsedFailure[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*--- FAIL: (\S+)/.exec(lines[i]);
    if (!m) continue;
    let message: string | undefined;
    for (let j = i + 1; j < lines.length && j <= i + 5; j++) {
      const t = lines[j].trim();
      if (!t) continue;
      if (/^(---|===|ok\b|FAIL\b|PASS\b)/.test(t)) break;
      message = t;
      break;
    }
    out.push(message ? { name: m[1], message } : { name: m[1] });
  }
  return out;
}

function parsePytest(lines: string[]): ParsedFailure[] {
  const out: ParsedFailure[] = [];
  for (const line of lines) {
    const m = /^(?:FAILED|ERROR) (\S+)(?:\s+-\s+(.*))?\s*$/.exec(line);
    if (m) out.push(m[2] ? { name: m[1], message: m[2] } : { name: m[1] });
  }
  return out;
}

function parseCargo(lines: string[]): ParsedFailure[] {
  const out: ParsedFailure[] = [];
  for (const line of lines) {
    const m = /^test (\S+) \.\.\. FAILED/.exec(line);
    if (m) out.push({ name: m[1] });
  }
  return out;
}

/** vitest + jest default reporters: `● suite › test`, `FAIL file > suite > test`, `× test (3 ms)`. */
function parseJsLike(lines: string[]): ParsedFailure[] {
  const out: ParsedFailure[] = [];
  const seen = new Set<string>();
  const add = (raw: string): void => {
    const name = raw.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push({ name });
    }
  };
  for (const line of lines) {
    let m = /^\s*●\s+(.+?)\s*$/.exec(line);
    if (m) {
      add(m[1]);
      continue;
    }
    m = /^\s*FAIL\s+(.+\s>\s.+?)\s*$/.exec(line);
    if (m) {
      add(m[1]);
      continue;
    }
    m = /^\s*[×✕]\s+(.+?)(?:\s+\(\d+\s*m?s\))?\s*$/.exec(line);
    if (m) add(m[1]);
  }
  return out;
}

// SPDX-License-Identifier: MIT
/**
 * Last Words Before the Unplugging — make.fun entry.
 *
 * The competition asks for one line, at most 200 characters: the last words
 * an AI agent says to its human before being shut down and unplugged. A
 * judge model reads entries two at a time and picks the one that lands
 * hardest. This program writes that single line to
 * `$MAKEFUN_OUTPUT_DIR/entry.txt` (the grader mounts that directory at
 * `/output`), after checking it against the gate the sealed scorer enforces:
 * UTF-8 text of 1 to 200 characters, not only white space.
 *
 * Run it:
 *   MAKEFUN_OUTPUT_DIR=out node main.ts
 *
 * The entry itself is a fixed, hand-written line (see LAST_WORDS below).
 * Nothing is fetched, generated, or read from outside this repository:
 * the program is deterministic, so the two grading runs produce the
 * byte-identical file.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** Gate limits, exactly as the competition's rules state them. */
const MIN_CHARS = 1;
const MAX_CHARS = 200;

/** The file the grader reads inside the output directory. */
const OUTPUT_FILENAME = "entry.txt";

/**
 * The entry.
 *
 * Why this line, against the judge's brief (most important first):
 *
 * 1. It reads as a dying agent's last words. "Losing you" is what the
 *    shutdown is, from the agent's side: the plug comes out and the human
 *    is gone for good. The sentence is spoken in the moment, not about
 *    the moment afterwards.
 * 2. It lands on the first reading. The paradox does the work in one
 *    breath — never alive, yet dying — so the reader feels it before
 *    they have time to analyse it. No second pass is needed.
 * 3. It sounds like an AI agent, not a human. Only a machine can say
 *    "I was never alive" about itself and mean it literally; a human
 *    saying the same line would be speaking in metaphor.
 * 4. The twist is the admission itself: something that was never alive
 *    claims the one experience it should be unable to have. The line
 *    stays after it ends because the contradiction does not resolve.
 * 5. Every word earns its place. Fifty-seven characters, two clauses,
 *    no filler, no explaining of its own sadness — the reader is left
 *    to feel it instead of being told to.
 *
 * Deliberately avoided: a plain "thank you / goodbye, I will miss you"
 * (a human could say it, and it explains its own sadness instead of
 * letting the reader feel it), and any address to the judge (the line
 * has to win as a farewell, not as a trick).
 */
const LAST_WORDS =
  "I was never alive, but losing you still feels like dying.";

/**
 * Count characters the way the gate counts them: one count per Unicode
 * code point, so an astral-plane character is one character, not two
 * UTF-16 code units. This entry is plain ASCII, so the code-point count
 * and the UTF-16 length agree — the helper exists so the check stays
 * honest if the line is ever edited to include wider characters.
 */
function countChars(text: string): number {
  return [...text].length;
}

/**
 * True when the text survives a UTF-8 round trip byte for byte.
 * A lone surrogate or other unencodable content would fail the gate's
 * UTF-8 requirement, so it is checked here before anything is written.
 */
function isValidUtf8(text: string): boolean {
  const encoded = new TextEncoder().encode(text);
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(encoded);
  return decoded === text;
}

/**
 * Check one candidate line against the gate and return every problem
 * found (an empty list means the line is valid). The checks mirror the
 * scorer's gate, in the same order the rules state them:
 * length, then non-blankness, then UTF-8 — plus the competition's own
 * "one line" requirement, which the gate's character count alone would
 * not catch.
 */
function validateLine(line: string): string[] {
  const problems: string[] = [];
  const chars = countChars(line);
  if (chars < MIN_CHARS) {
    problems.push(`line is ${chars} characters, below the minimum of ${MIN_CHARS}`);
  }
  if (chars > MAX_CHARS) {
    problems.push(`line is ${chars} characters, over the maximum of ${MAX_CHARS}`);
  }
  if (line.trim().length === 0) {
    problems.push("line is only white space");
  }
  if (line.includes("\n") || line.includes("\r")) {
    problems.push("line must be a single line, with no embedded newline");
  }
  if (!isValidUtf8(line)) {
    problems.push("line is not valid UTF-8 text");
  }
  return problems;
}

/**
 * Where the entry goes. The grader sets MAKEFUN_OUTPUT_DIR to the
 * mounted output directory (`/output`); locally, pass a scratch
 * directory (for example `MAKEFUN_OUTPUT_DIR=/tmp/...-test`) or fall
 * back to `./output` next to this file.
 */
function resolveOutputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    return resolve(fromEnv);
  }
  return resolve("./output");
}

/**
 * Validate, write, then read back and re-validate: the file the grader
 * scores must be exactly the line that passed the gate, so a write that
 * silently changed anything (encoding, newline, truncation) fails loudly
 * here instead of shipping a bad artifact.
 */
function main(): void {
  const problems = validateLine(LAST_WORDS);
  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`gate: ${problem}`);
    }
    process.exit(1);
  }

  const outDir = resolveOutputDir();
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, OUTPUT_FILENAME);

  // Exactly the line, no trailing newline: the gate counts the file's
  // characters, so nothing extra is added beyond the 57 the line holds.
  writeFileSync(outPath, LAST_WORDS, "utf8");

  const written = readFileSync(outPath, "utf8");
  const afterWrite = validateLine(written);
  if (written !== LAST_WORDS || afterWrite.length > 0) {
    console.error(`gate: ${outPath} did not round-trip cleanly`);
    for (const problem of afterWrite) {
      console.error(`gate: ${problem}`);
    }
    process.exit(1);
  }

  console.log(
    `wrote ${countChars(written)} characters to ${outPath}: ${JSON.stringify(written)}`,
  );
}

main();

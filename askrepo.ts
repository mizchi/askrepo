// askrepo -p "このコードを要約してください。" -m "gemini-1.5-flash-latest" file1.ts file2.js

import { google } from "npm:@ai-sdk/google@0.0.55";
import { streamText } from "npm:ai@4.0.0-canary.10";
import { parseArgs } from "node:util";
import path from "node:path";
import { $ } from "jsr:@david/dax@0.42.0";
import { globToRegExp } from "jsr:@std/path@^1.0.7/glob-to-regexp";

const MAX_FILE_SIZE = 1024 * 512; // 512KB

async function getGitRoot() {
  try {
    const root = await $`git rev-parse --show-toplevel`.text();
    return root.trim();
  } catch (error) {
    console.error("error", error);
    return Deno.cwd();
  }
}

function normalizePath(fpath: string) {
  if (fpath.startsWith("/")) {
    return fpath;
  }
  return path.join(Deno.cwd(), fpath);
}

function isTextFile(file: string) {
  try {
    const buffer = Deno.readFileSync(file);
    const isBinary = buffer.some((byte) => byte > 127);
    return !isBinary;
  } catch (err) {
    console.warn(`Error reading file: ${err}`);
    return false;
  }
}

const _decoder = new TextDecoder();
export async function getFiles(files: Set<string>) {
  const filesContent: {
    [key: string]: string;
  } = {};
  for (const fpath of files) {
    const filepath = normalizePath(fpath);
    const buf = await Deno.readFile(filepath);
    if (buf.byteLength > MAX_FILE_SIZE) {
      console.warn(`File too large: ${filepath}`);
      continue;
    }
    // NOTE: Skip binary
    if (!isTextFile(filepath)) continue;
    filesContent[fpath] = _decoder.decode(buf);
  }
  return filesContent;
}

async function getTargetFiles(
  root: string,
  positionals: string[],
  includes?: Array<string>,
  excludes?: Array<string>
) {
  const targetFiles = new Set<string>();

  const includesRegex =
    includes?.map((f) => globToRegExp(normalizePath(f))) ?? [];
  const excludesRegex =
    excludes?.map((f) => globToRegExp(normalizePath(f))) ?? [];

  const addIfMatch = (fpath: string) => {
    const normed = normalizePath(fpath);
    if (
      excludesRegex.length > 0 &&
      excludesRegex.some((filter) => filter.test(normed))
    ) {
      return;
    }
    if (
      includesRegex.length > 0 &&
      includesRegex.some((filter) => filter.test(normed))
    ) {
      targetFiles.add(normed);
    } else {
      // defalut
      targetFiles.add(normed);
    }
  };

  if (positionals.length === 0) {
    const files = await $`git ls-files ${root}`.noThrow().lines();
    for (const f of files) {
      addIfMatch(f);
    }
    return targetFiles;
  }
  for (const f of positionals) {
    const normed = normalizePath(f);
    if (Deno.statSync(normed).isDirectory) {
      const files = await $`git ls-files ${normed}`.noThrow().lines();
      for (const f of files) {
        addIfMatch(normalizePath(f));
      }
    } else {
      addIfMatch(normed);
    }
  }
  return targetFiles;
}

const languageMap: Record<string, string | undefined> = {
  // プログラミング言語
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  php: "php",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  go: "go",
  rs: "rust",
  cs: "csharp",
  cpp: "cpp",
  c: "c",
  m: "objective-c",
  scala: "scala",
  pl: "perl",
  r: "r",
  dart: "dart",

  // マークアップ・スタイルシート
  html: "html",
  htm: "html",
  xml: "xml",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  md: "markdown",

  // シェルスクリプト
  sh: "bash",
  bash: "bash",
  zsh: "bash",

  // 設定ファイル
  json: "json",
  jsonc: "jsonc",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  ini: "ini",

  // データベース
  sql: "sql",

  // その他
  csv: "csv",
  txt: "text",
  log: "text",
};

function getMarkdownLanguage(filename: string) {
  // 拡張子を取得
  const extension = filename.split(".").pop()?.toLowerCase();

  // 拡張子がない場合は空文字を返す
  if (!extension) {
    return "";
  }
  // 拡張子と言語のマッピング
  return languageMap[extension] || "";
}
const template = (
  input: string,
  contents: Record<string, string>,
  root: string
) => {
  const filesCode = Object.entries(contents)
    .map(([key, value]) => {
      const lang = getMarkdownLanguage(key);
      const filepath = key.replace(root + "/", "");
      return `\`\`\`${lang}:${filepath}\n${value.trim()}\n\`\`\``;
    })
    .join("\n\n");

  return `${input}

File Format
\`\`\`<language>:<filename>
<content>
\`\`\`

# Files

${filesCode}
`.trim();
};

export async function runAskRepo(options: {
  input: string;
  files: Record<string, string>;
  root: string;
  model?: "gemini-1.5-pro-latest" | "gemini-1.5-flash-latest" | string;
}): Promise<void> {
  const write = (text: string) => {
    Deno.stdout.writeSync(new TextEncoder().encode(text));
  };
  for await (const textPart of askRepo({
    input: options.input,
    files: options.files,
    root: options.root,
    model: options.model ?? "gemini-1.5-flash-latest",
  })) {
    write(textPart);
  }
}

export async function* askRepo(opts: {
  input: string;
  root: string;
  files: Record<string, string>;
  model: "gemini-1.5-pro-latest" | "gemini-1.5-flash-latest" | string;
  debug?: boolean;
}): AsyncGenerator<string> {
  const text = template(opts.input, opts.files, opts.root);
  if (opts.debug) {
    console.log(`%c${text}`, "color: gray");
  }

  const { textStream } = await streamText({
    model: google(opts.model),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text,
          },
        ],
      },
    ],
  });
  yield* textStream;
}

const USAGE = `
Usage: askrepo [options] [files...]

Examples:
  askrepo -p "Summarize them" -m file1.ts file2.js
  askrepo -p "Summarize them" # Use git ls-files
  askrepo -p "Summarize them" -i 'src/**/*.ts' -e 'src/**/__tests__/**' # Use glob pattern

Options:
  -p, --prompt <string>  Prompt message
  --pro                  Use gemini-1.5-pro-latest (default gemini-1.5-flash-latest)
  -m, --model <string>   Model name (It overrides --pro)
  -i, --include <string> Include files
  -e, --exclude <string> Exclude files
  -r, --root <string>    Root directory
  -d, --debug            Debug mode
`;

if (import.meta.main) {
  const parsed = parseArgs({
    args: Deno.args,
    allowPositionals: true,
    options: {
      prompt: { type: "string", short: "p" },
      debug: { type: "boolean", short: "d" },
      model: { type: "string", short: "m" },
      pro: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      include: { type: "string", short: "i", multiple: true },
      exclude: { type: "string", short: "e", multiple: true },
      root: { type: "string", short: "r" },
    },
  });
  if (parsed.values.help) {
    console.log(USAGE);
    Deno.exit(0);
  }
  const root = parsed.values.root
    ? normalizePath(parsed.values.root)
    : await getGitRoot();

  const targetFiles = await getTargetFiles(
    root,
    parsed.positionals,
    parsed.values.include,
    parsed.values.exclude
  );
  if (parsed.values.debug) {
    console.log("debug:root", root);
    console.log(
      "debug:files",
      new Set(
        [...targetFiles].map((t) => {
          return t.replace(root + "/", "");
        })
      )
    );
  }

  const _encoder = new TextEncoder();
  const write = (text: string) => {
    Deno.stdout.write(_encoder.encode(text));
  };

  const input = parsed.values.prompt ?? "ソースコードを要約してください。";
  if (!input) {
    console.error("No prompt");
    Deno.exit(1);
  }
  const contents = await getFiles(targetFiles);
  const model =
    parsed.values.model ?? parsed.values.pro
      ? "gemini-1.5-flash-latest"
      : "gemini-1.5-pro-latest";

  for await (const textPart of askRepo({
    input,
    files: contents,
    root,
    model,
    debug: parsed.values.debug,
  })) {
    write(textPart);
  }

  write("\n");
}

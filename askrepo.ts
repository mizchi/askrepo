// askrepo -i "このコードを要約してください。" -m "gemini-1.5-flash-latest" file1.ts file2.js

import { google } from "npm:@ai-sdk/google@0.0.55";
import { streamText } from "npm:ai@4.0.0-canary.10";
import { parseArgs } from "node:util";
import path from "node:path";
import { $ } from "jsr:@david/dax@0.42.0";
import { globToRegExp } from "jsr:@std/path@^1.0.7/glob-to-regexp";

function normalizePath(fpath: string) {
  if (fpath.startsWith("/")) {
    return fpath;
  }
  return path.join(Deno.cwd(), fpath);
}

async function getFilesContent(
  basePath: string,
  matcher: (fpath: string) => boolean
) {
  const filesContent: {
    [key: string]: string;
  } = {};

  const files: string[] = await $`git ls-files ${basePath}`.noThrow().lines();
  for (const fpath of files) {
    const filepath = normalizePath(fpath);
    if (!matcher(filepath)) {
      continue;
    }
    const content = await Deno.readTextFile(filepath);
    filesContent[fpath] = content;
  }
  return filesContent;
}

const parsed = parseArgs({
  args: Deno.args,
  allowPositionals: true,
  options: {
    input: { type: "string", short: "i" },
    model: { type: "string", short: "m" },
    show: { type: "boolean", short: "s" },
    filter: { type: "string", short: "f", multiple: true },
  },
});

const targetFiles = new Set(
  parsed.positionals.map((fName) => {
    return normalizePath(fName);
  })
);
const filters =
  parsed.values.filter?.map((f) => {
    return globToRegExp(normalizePath(f));
  }) ?? [];
const matcher = (fpath: string) => {
  if (filters.length > 0) {
    console.log("filters", filters);
    return filters.some((filter) => filter.test(fpath));
  }
  if (parsed.positionals.length > 0) {
    return targetFiles.has(normalizePath(fpath));
  }
  return true;
};
// const matcher =
//   parsed.positionals.length > 0
//     ? (fpath: string) => {
//         if (fpath.startsWith("/")) {
//           return targetFiles.has(fpath);
//         }
//         return targetFiles.has(path.join(Deno.cwd(), fpath));
//       }
//     : () => true;

const contents = await getFilesContent(".", matcher);

const _encoder = new TextEncoder();
const write = (text: string) => {
  Deno.stdout.write(_encoder.encode(text));
};

const input = parsed.values.input ?? "ソースコードを要約してください。";
if (!input) {
  console.error("No prompt");
  Deno.exit(1);
}

const text = `
${input}

以下はこのリポジトリのソースコードです。

Files:

${Object.entries(contents)
  .map(([key, value]) => `\`\`\`${key}\n${value}\n\`\`\``)
  .join("\n")}
`;

console.log("files", Object.keys(contents).length);

if (parsed.values.show) {
  console.log(text);
}

const { textStream } = await streamText({
  model: google(parsed.values.model ?? "gemini-1.5-flash-latest"),
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: text,
        },
      ],
    },
  ],
});

for await (const textPart of textStream) {
  write(textPart);
}
write("\n");

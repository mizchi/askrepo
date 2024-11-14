// run as module
// import { runAskRepo, getFiles } from "jsr:@mizchi/askrepo";
import { runAskRepo, getFiles } from "./askrepo.ts";

await runAskRepo({
  input: "ソースコードを要約してください。",
  root: Deno.cwd(),
  files: await getFiles(new Set(["askrepo.ts", "mod.ts"])),
});

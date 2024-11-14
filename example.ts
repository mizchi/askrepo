// run as module
// import { runAskRepo, getFiles } from "jsr:@mizchi/askrepo";
import { runAskRepo, getFileContents } from "./askrepo.ts";

await runAskRepo({
  input: "ソースコードを要約してください。",
  root: Deno.cwd(),
  files: await getFileContents(["askrepo.ts"]),
});

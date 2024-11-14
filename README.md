# @mizchi/askrepo

```bash
$ deno install -Afg jsr:@mizchi/askrepo
# export GOOGLE_GENERATIVE_AI_API_KEY=...
$ askrepo -h
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

# Use
$ askrepo -p "Summarize them"
$ askrepo -p "Describe about main.ts" main.ts package.json
```

## LICENSE

MIT
# @mizchi/askrepo

Ask your code repository questions using Google Gemini.

This Deno CLI tool leverages the power of Google's Gemini generative AI models to provide answers and insights about your codebase. Simply provide a prompt and specify the files you want to analyze, and `askrepo` will handle the rest.

## Installation

```bash
deno install -Afg jsr:@mizchi/askrepo
```

**API Key Setup:**

You'll need to set the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable with your Google Gemini API key.

```bash
export GOOGLE_GENERATIVE_AI_API_KEY=...
```


## Usage

```bash
askrepo -p "Your prompt here" [files...]
```

**Examples:**

* **Analyze specific files:**

```bash
askrepo -p "Summarize these files" file1.ts file2.js
```

* **Analyze all files tracked by Git:**

```bash
askrepo -p "Summarize the project" # Defaults to using git ls-files
```

* **Use glob patterns for file selection:**

```bash
askrepo -p "Summarize the source code" -i 'src/**/*.ts' -e 'src/**/__tests__/**'
```

## Options

```
Usage: askrepo [options] [files...]

Options:
  -p, --prompt <string>  The prompt to send to Gemini. (Required)
  --pro                  Use gemini-1.5-pro-latest (default: gemini-1.5-flash-latest)
  -m, --model <string>   Specify a different Gemini model. This overrides --pro.
  -i, --include <string> Include files matching this glob pattern.
  -e, --exclude <string> Exclude files matching this glob pattern.
  -r, --root <string>    Specify the root directory for glob patterns. Defaults to the current directory.
  -d, --debug            Enable debug mode for verbose output.
  -h, --help             Display this help message.
```


## Example Prompts

* **Summarization:** "Summarize these files"
* **Code Explanation:** "Explain what this code does"
* **Bug Detection:** "Are there any potential bugs in this code?"
* **Refactoring Suggestions:** "Suggest improvements for this code"
* **Feature Ideas:** "Brainstorm new features based on this code"


## Development

This project uses Deno.  The `deno.jsonc` file defines the project metadata.  The `.vscode/settings.json` file enables Deno support in VS Code.


## License

MIT
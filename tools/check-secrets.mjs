import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const maximumFileBytes = 5_000_000;
const textExtensions = new Set(["", ".cjs", ".css", ".env", ".example", ".html", ".js", ".json", ".jsx", ".md", ".mjs", ".ps1", ".sh", ".sql", ".svg", ".ts", ".tsx", ".txt", ".webmanifest", ".xml", ".yaml", ".yml"]);
const allowedExampleFiles = new Set(["server/.env.example"]);

const rules = [
  { name: "OpenAI API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { name: "GitHub access token", pattern: /\b(?:gh[opusr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { name: "Stripe live key", pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { name: "Private key material", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  {
    name: "Credential assignment",
    pattern: /\b(?:DATABASE_URL|JWT_SECRET|OPENAI_API_KEY|NORTH_ISSUE_WEBHOOK_URL)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#;]+))/g,
    isFinding: (match) => !/(?:\$|^\*|^replace-|^your-|^example|^postgres(?:ql)?:\/\/(?:postgres:postgres|north_app:password)@)/i.test(match[1] ?? match[2] ?? match[3]),
  },
];

function trackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" });
  return output.split("\0").filter(Boolean);
}

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [relative(root, path).replaceAll("\\", "/")];
  });
}

function isTextFile(path) {
  const absolutePath = join(root, path);
  return existsSync(absolutePath) && textExtensions.has(extname(path).toLowerCase()) && statSync(absolutePath).size <= maximumFileBytes;
}

const findings = [];
const files = [...new Set([...trackedFiles(), ...filesUnder(join(root, "dist"))])];

for (const path of files) {
  if (allowedExampleFiles.has(path) || !isTextFile(path)) continue;
  const content = readFileSync(join(root, path), "utf8");
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const match of content.matchAll(rule.pattern)) {
      if (rule.isFinding && !rule.isFinding(match)) continue;
      const line = content.slice(0, match.index).split("\n").length;
      findings.push({ path, line, rule: rule.name });
    }
  }
}

if (findings.length) {
  console.error("Potential secrets detected. Values are intentionally not printed:");
  for (const finding of findings) console.error(`- ${finding.path}:${finding.line} (${finding.rule})`);
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed: ${files.length} tracked/build files checked.`);
}
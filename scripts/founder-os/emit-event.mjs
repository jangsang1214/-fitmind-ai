import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const eventName = process.env.GITHUB_EVENT_NAME ?? "unknown";
const eventPath = process.env.GITHUB_EVENT_PATH;
const repository = process.env.GITHUB_REPOSITORY ?? "unknown/unknown";
const runId = process.env.GITHUB_RUN_ID ?? "local";
const fallbackRef = process.env.GITHUB_REF_NAME ?? process.env.GITHUB_REF ?? "unknown";
const fallbackSha = process.env.GITHUB_SHA ?? "unknown";

if (!eventPath) throw new Error("GITHUB_EVENT_PATH is required");
const raw = JSON.parse(await readFile(eventPath, "utf8"));

function repositoryIdFor(fullName) {
  if (fullName === "jangsang1214/GARANG-ai-agent") return "control";
  if (fullName === "jangsang1214/-fitmind-ai") return "product";
  return "external";
}

function resolveType() {
  if (eventName === "pull_request") {
    if (raw.action === "opened" || raw.action === "reopened") return "pull_request.opened";
    if (raw.action === "closed") return "pull_request.closed";
    return "pull_request.updated";
  }
  if (eventName === "workflow_run") {
    return raw.workflow_run?.conclusion === "success" ? "ci.green" : "ci.failed";
  }
  if (eventName === "push") return "main.updated";
  if (eventName === "release") return "release.tagged";
  throw new Error(`Unsupported GitHub event: ${eventName}`);
}

const ref = raw.pull_request?.head?.ref
  ?? raw.workflow_run?.head_branch
  ?? raw.release?.target_commitish
  ?? fallbackRef;
const sha = raw.pull_request?.head?.sha
  ?? raw.workflow_run?.head_sha
  ?? raw.after
  ?? fallbackSha;

const envelope = {
  schemaVersion: "1.0",
  id: `github-${runId}-${raw.action ?? eventName}`,
  type: resolveType(),
  occurredAt: new Date().toISOString(),
  source: {
    repositoryId: repositoryIdFor(repository),
    repository,
    ref: String(ref),
    sha: String(sha)
  },
  payload: {
    githubEvent: eventName,
    action: raw.action ?? null,
    pullRequestNumber: raw.pull_request?.number ?? raw.number ?? null,
    workflowRunId: raw.workflow_run?.id ?? null,
    workflowConclusion: raw.workflow_run?.conclusion ?? null,
    releaseTag: raw.release?.tag_name ?? null
  }
};

const outputDir = path.resolve("artifacts");
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "founder-os-event.json");
await writeFile(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
console.log(outputPath);

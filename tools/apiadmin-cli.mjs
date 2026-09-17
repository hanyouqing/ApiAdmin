#!/usr/bin/env node
/**
 * ApiAdmin CLI — Newman-like runner for CI/CD.
 *
 * Usage:
 *   apiadmin run-collection --url http://localhost:3000 --token $TOKEN --collection <id> [--format junit] [--data ./data.json]
 *   apiadmin run-pipeline   --url http://localhost:3000 --token $TOKEN --task <id> [--wait]
 *   apiadmin sync-swagger   --url http://localhost:3000 --token $TOKEN --project <id> --swagger-url <url>
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function request(baseUrl, token, method, apiPath, body) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${apiPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-CLI-Token': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function loadIterationData(filePath) {
  if (!filePath) return undefined;
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, 'utf8');
  const data = JSON.parse(raw);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.iterations)) return data.iterations;
  throw new Error('iteration data must be a JSON array or { iterations: [] }');
}

async function runCollection(args) {
  const baseUrl = args.url || process.env.APIADMIN_URL || 'http://localhost:3000';
  const token = args.token || process.env.APIADMIN_TOKEN;
  const collectionId = args.collection || process.env.TEST_COLLECTION_ID;
  if (!token || !collectionId) {
    console.error('Missing --token / APIADMIN_TOKEN or --collection / TEST_COLLECTION_ID');
    process.exit(2);
  }

  const body = {
    collectionId,
    environment: args.environment ? { name: args.environment } : {},
    format: args.format || 'junit',
    iteration_data: loadIterationData(args.data),
  };

  const { status, json } = await request(baseUrl, token, 'POST', '/api/cicd/run', body);
  if (!json.success) {
    console.error(json.message || `HTTP ${status}`);
    process.exit(1);
  }

  const payload = json.data || {};
  if (payload.content && (args.format === 'junit' || args.out)) {
    const out = args.out || 'apiadmin-junit.xml';
    fs.writeFileSync(out, payload.content);
    console.log(`Wrote ${out}`);
  } else {
    console.log(JSON.stringify(payload.report || payload, null, 2));
  }

  const exitCode = payload.exitCode ?? ((payload.report?.failed || 0) + (payload.report?.errors || 0) > 0 ? 1 : 0);
  process.exit(exitCode);
}

async function runPipeline(args) {
  const baseUrl = args.url || process.env.APIADMIN_URL || 'http://localhost:3000';
  const token = args.token || process.env.APIADMIN_TOKEN;
  const taskId = args.task || process.env.TEST_PIPELINE_ID;
  if (!token || !taskId) {
    console.error('Missing --token / APIADMIN_TOKEN or --task / TEST_PIPELINE_ID');
    process.exit(2);
  }

  const body = {
    taskId,
    environment_id: args['environment-id'] || undefined,
    wait: args.wait !== 'false',
    iteration_data: loadIterationData(args.data),
  };

  const { status, json } = await request(baseUrl, token, 'POST', '/api/cicd/run-pipeline', body);
  if (!json.success) {
    console.error(json.message || `HTTP ${status}`);
    process.exit(1);
  }
  console.log(JSON.stringify(json.data, null, 2));
  process.exit(json.data?.exitCode || 0);
}

async function syncSwagger(args) {
  const baseUrl = args.url || process.env.APIADMIN_URL || 'http://localhost:3000';
  const token = args.token || process.env.APIADMIN_TOKEN;
  const projectId = args.project || process.env.PROJECT_ID;
  const swaggerUrl = args['swagger-url'] || process.env.SWAGGER_URL;
  if (!token || !projectId || !swaggerUrl) {
    console.error('Need --token, --project, --swagger-url');
    process.exit(2);
  }
  const { status, json } = await request(baseUrl, token, 'POST', '/api/cicd/sync-swagger', {
    url: swaggerUrl,
    projectId,
    mode: args.mode || 'normal',
  });
  if (!json.success) {
    console.error(json.message || `HTTP ${status}`);
    process.exit(1);
  }
  console.log(JSON.stringify(json.data, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (cmd === 'run-collection') return runCollection(args);
  if (cmd === 'run-pipeline') return runPipeline(args);
  if (cmd === 'sync-swagger') return syncSwagger(args);
  console.log(`ApiAdmin CLI

Commands:
  run-collection   Run a test collection (Newman-like)
  run-pipeline     Run an AutoTest pipeline task
  sync-swagger     Sync OpenAPI/Swagger into a project

Examples:
  apiadmin run-collection --url http://localhost:3000 --token $TOKEN --collection <id> --format junit --out junit.xml
  apiadmin run-pipeline --url http://localhost:3000 --token $TOKEN --task <id>
  apiadmin run-collection --data ./iterations.json --collection <id> --token $TOKEN
`);
  process.exit(cmd ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

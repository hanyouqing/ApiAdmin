#!/usr/bin/env node
/**
 * Seed a demo group/project and import examples/openapi-petstore-mini.json.
 *
 * Usage:
 *   make seed-demo
 *   cd Server && npx tsx scripts/seed-demo.mjs
 *
 * Env:
 *   MONGODB_URL / TEST_MONGODB_URL  — default mongodb://127.0.0.1:27017/apiadmin
 *   DEMO_EMAIL                      — default demo@apiadmin.local
 *   DEMO_PASSWORD                   — default Demo1234!
 *   DEMO_PROJECT_NAME               — default ApiAdmin Demo
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import User from '../Models/User.js';
import Group from '../Models/Group.js';
import Project from '../Models/Project.js';
import { SwaggerImporter } from '../Utils/importers/SwaggerImporter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

const mongoUrl =
  process.env.MONGODB_URL ||
  process.env.TEST_MONGODB_URL ||
  'mongodb://127.0.0.1:27017/apiadmin';

const demoEmail = process.env.DEMO_EMAIL || 'demo@apiadmin.local';
const demoPassword = process.env.DEMO_PASSWORD || 'Demo1234!';
const demoProjectName = process.env.DEMO_PROJECT_NAME || 'ApiAdmin Demo';

async function main() {
  console.log(`Connecting ${mongoUrl.replace(/\/\/.*@/, '//***@')} …`);
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10000 });

  let user = await User.findOne({ email: demoEmail });
  if (!user) {
    user = await User.create({
      username: 'demo',
      email: demoEmail,
      password: demoPassword,
      role: 'super_admin',
    });
    console.log(`Created user ${demoEmail} / ${demoPassword}`);
  } else {
    console.log(`Using existing user ${demoEmail}`);
  }

  let group = await Group.findOne({ group_name: 'Demo Group', uid: user._id });
  if (!group) {
    group = await Group.create({
      group_name: 'Demo Group',
      group_desc: 'OSS golden-path demo',
      uid: user._id,
      member: [user._id],
    });
    console.log('Created Demo Group');
  }

  let project = await Project.findOne({ project_name: demoProjectName, group_id: group._id });
  if (!project) {
    project = await Project.create({
      project_name: demoProjectName,
      project_desc: 'Seeded from examples/openapi-petstore-mini.json',
      group_id: group._id,
      uid: user._id,
      member: [user._id],
      basepath: '',
      env: [{ name: 'httpbin', host: 'https://httpbin.org', variables: {} }],
    });
    console.log(`Created project ${demoProjectName}`);
  } else {
    console.log(`Using existing project ${demoProjectName}`);
  }

  const specPath = join(root, 'examples/openapi-petstore-mini.json');
  const raw = await readFile(specPath, 'utf8');
  const importer = new SwaggerImporter();
  const result = await importer.import(raw, {
    projectId: project._id,
    userId: user._id,
    mode: 'normal',
  });

  console.log('Import result:', result);
  console.log('');
  console.log('Next:');
  console.log('  1. make start');
  console.log(`  2. Login as ${demoEmail}`);
  console.log(`  3. Open project "${demoProjectName}" → Interface / Mock / Pipeline / Monitors`);
  console.log('  4. See Docs/QUICKSTART_OSS.md');

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

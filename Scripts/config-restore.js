#!/usr/bin/env node
/**
 * Logical config restore for ApiAdmin.
 * Usage: node Scripts/config-restore.js --file ./backups/apiadmin-config-backup.json
 *
 * Replaces documents in backed-up collections (deleteMany + insertMany).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../Server/.env') });

function parseArgs(argv) {
  const out = { file: '' };
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--file' || argv[i] === '-f') && argv[i + 1]) {
      out.file = argv[++i];
    } else if (!argv[i].startsWith('-') && !out.file) {
      out.file = argv[i];
    }
  }
  return out;
}

function resolveUri() {
  if (process.env.MONGODB_URL) return process.env.MONGODB_URL;
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const db = process.env.MONGO_DATABASE || 'apiadmin';
  const user = process.env.MONGO_USERNAME || '';
  const pass = process.env.MONGO_PASSWORD || '';
  if (user && pass) {
    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}?authSource=admin`;
  }
  return `mongodb://${host}:${port}/${db}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error('❌ Usage: node Scripts/config-restore.js --file path/to/config.json');
    process.exit(1);
  }

  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!payload.collections || typeof payload.collections !== 'object') {
    console.error('❌ Invalid backup: missing collections');
    process.exit(1);
  }

  console.log('⚠️  Restoring logical config. Matching collections will be replaced.');
  console.log('   Press Ctrl+C within 3s to cancel...');
  await new Promise((r) => setTimeout(r, 3000));

  await mongoose.connect(resolveUri());
  const db = mongoose.connection.db;

  for (const [name, docs] of Object.entries(payload.collections)) {
    if (!Array.isArray(docs)) continue;
    const col = db.collection(name);
    await col.deleteMany({});
    if (docs.length > 0) {
      await col.insertMany(docs);
    }
    console.log(`  ${name}: restored ${docs.length}`);
  }

  await mongoose.disconnect();
  console.log(`✅ Config restore complete from ${filePath}`);
}

main().catch(async (err) => {
  console.error('❌', err.message || err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

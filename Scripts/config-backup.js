#!/usr/bin/env node
/**
 * Logical config backup for ApiAdmin (JSON, cross-env).
 * Usage: node Scripts/config-backup.js --out ./backups/apiadmin-config-backup.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../Server/.env') });

const COLLECTIONS = [
  'users',
  'rolepermissions',
  'ssoproviders',
  'whitelistconfigs',
  'whitelists',
  'emailconfigs',
  'emailtemplates',
  'thirdpartyauthconfigs',
  'plugins',
  'aiconfigs',
  'notificationsettings',
  'autotestconfigs',
  'testruleconfigs',
];

function parseArgs(argv) {
  const out = { out: './backups/apiadmin-config-backup.json' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      out.out = argv[++i];
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
  const uri = resolveUri();

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    database: db.databaseName,
    collections: {},
  };

  for (const name of COLLECTIONS) {
    const docs = await db.collection(name).find({}).toArray();
    payload.collections[name] = docs;
    console.log(`  ${name}: ${docs.length}`);
  }

  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  await mongoose.disconnect();
  console.log(`✅ Config backup written: ${outPath}`);
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

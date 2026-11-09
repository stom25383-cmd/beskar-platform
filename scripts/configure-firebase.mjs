#!/usr/bin/env node
/**
 * Generate .env.local from a Firebase service-account JSON file.
 * Usage: node scripts/configure-firebase.mjs /path/to/service-account.json
 * The JSON file is never copied into the project.
 */
import { promises as fs } from "fs";
import path from "path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/configure-firebase.mjs /path/to/service-account.json");
  process.exit(1);
}

const raw = await fs.readFile(path.resolve(input), "utf8");
const sa = JSON.parse(raw);
for (const key of ["project_id", "client_email", "private_key"]) {
  if (!sa[key]) throw new Error(`Service account is missing: ${key}`);
}

const envPath = path.resolve(".env.local");
const existing = await fs.readFile(envPath, "utf8").catch(() => "");
const values = {
  BESKAR_DRIVER: "firebase",
  BESKAR_STORAGE_DRIVER: "firebase",
  FIREBASE_ADMIN_PROJECT_ID: sa.project_id,
  FIREBASE_ADMIN_CLIENT_EMAIL: sa.client_email,
  FIREBASE_ADMIN_PRIVATE_KEY: sa.private_key.replace(/\n/g, "\\n"),
  FIREBASE_STORAGE_BUCKET:
    process.env.FIREBASE_STORAGE_BUCKET || `${sa.project_id}.firebasestorage.app`,
};

const lines = existing
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => !Object.prototype.hasOwnProperty.call(values, line.split("=")[0]));

lines.push("", "# Firebase configured by scripts/configure-firebase.mjs");
for (const [k, v] of Object.entries(values)) lines.push(`${k}=${v}`);
await fs.writeFile(envPath, `${lines.join("\n")}\n`, { mode: 0o600 });
console.log(`Firebase configuration written to ${envPath}`);
console.log("The service-account JSON itself was not copied into the project.");

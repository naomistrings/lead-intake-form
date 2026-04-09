#!/usr/bin/env node

import { purgeSheetOldRows } from "../lib/sheets.js";

const spreadsheetId = process.env.SHEET_ID;
const days = process.env.PURGE_DAYS ? Number(process.env.PURGE_DAYS) : 30;

if (!spreadsheetId) {
  console.error("Missing SHEET_ID environment variable.");
  process.exit(1);
}

if (
  !process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
  !(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
) {
  console.error(
    "Missing Google Sheets credentials. Set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.",
  );
  process.exit(1);
}

async function run() {
  try {
    const result = await purgeSheetOldRows(spreadsheetId, days);
    console.log(`Deleted rows older than ${days} days: ${result.deletedRows}`);
  } catch (error) {
    console.error("Failed to purge old rows:", error.message || error);
    process.exit(1);
  }
}

run();

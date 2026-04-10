import { google } from "googleapis";

function buildRow(entry) {
  return [
    entry.contactType || "",
    entry.contactTags || "",
    entry.propertyName || "",
    entry.address || "",
    entry.companyName || "",
    "", // Owner (reserved column)
    entry.city || "",
    entry.units || "",
    entry.heatingFuel || "",
    entry.heatingType || "",
    entry.constructionType || "",
    entry.roofType || "",
    entry.contactFirstName || "",
    entry.contactLastName || "",
    entry.contactEmail || "",
    entry.contactPhone || "",
    entry.contactAddress || "",
    entry.tag || "",
    entry.source || "",
    entry.employeeName || "",
    entry.dateSubmitted || "",
    entry.comment || "",
    "Yes", // Tracking
  ];
}

export async function appendEntries(entries) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const tab = process.env.GOOGLE_SHEET_TAB || "Sheet1";

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: entries.map(buildRow),
    },
  });
}

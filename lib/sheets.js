import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getGoogleCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (error) {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON.");
    }
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  throw new Error(
    "Google Sheets credentials are missing. Set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.",
  );
}

function getSheetsClient() {
  const creds = getGoogleCredentials();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SCOPES,
  });
  return google.sheets({ version: "v4", auth });
}

export async function appendSheetRow(spreadsheetId, row) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A1",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  return response.data;
}

export async function purgeSheetOldRows(spreadsheetId, days = 30) {
  const sheets = getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  });

  const sheet = spreadsheet.data.sheets?.[0];
  if (!sheet?.properties?.sheetId) {
    throw new Error("Unable to resolve sheet ID.");
  }

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A1:Z",
  });

  const rows = result.data.values || [];
  if (rows.length === 0) {
    return { deletedRows: 0 };
  }

  const headers = rows[0];
  const dateIndex = headers.indexOf("Date Submitted");
  if (dateIndex === -1) {
    throw new Error("Date Submitted header not found in sheet.");
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const requests = [];
  for (let index = rows.length - 1; index >= 1; index -= 1) {
    const row = rows[index];
    const dateValue = row[dateIndex];
    if (!dateValue) continue;
    const submittedDate = new Date(dateValue);
    if (Number.isNaN(submittedDate.getTime())) continue;
    if (submittedDate < cutoff) {
      requests.push({
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: "ROWS",
            startIndex: index,
            endIndex: index + 1,
          },
        },
      });
    }
  }

  if (requests.length === 0) {
    return { deletedRows: 0 };
  }

  const batchUpdateResponse = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  });

  return {
    deletedRows: requests.length,
    batchUpdate: batchUpdateResponse.data,
  };
}

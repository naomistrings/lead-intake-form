import { purgeSheetOldRows } from "../../../lib/sheets";

export async function POST(request) {
  const spreadsheetId = process.env.SHEET_ID;
  if (!spreadsheetId) {
    return new Response(JSON.stringify({ error: "Missing SHEET_ID" }), {
      status: 500,
    });
  }

  if (
    !process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
    !(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
  ) {
    return new Response(
      JSON.stringify({
        error:
          "Missing Google Sheets credentials. Set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.",
      }),
      { status: 500 },
    );
  }

  const days = process.env.PURGE_DAYS ? Number(process.env.PURGE_DAYS) : 30;

  try {
    const result = await purgeSheetOldRows(spreadsheetId, days);
    return new Response(
      JSON.stringify({ success: true, deletedRows: result.deletedRows }),
      { status: 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to purge old rows." }),
      { status: 500 },
    );
  }
}

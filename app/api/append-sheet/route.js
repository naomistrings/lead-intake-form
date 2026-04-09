import { appendSheetRow } from "../../../lib/sheets";

export async function POST(request) {
  const spreadsheetId = process.env.SHEET_ID;
  if (!spreadsheetId) {
    return new Response(JSON.stringify({ error: "Missing SHEET_ID" }), {
      status: 500,
    });
  }

  const body = await request.json();
  const {
    contactType = "",
    contactTags = "",
    propertyName = "",
    address = "",
    companyName = "",
    city = "",
    units = "",
    heatingFuel = "",
    heatingType = "",
    constructionType = "",
    roofType = "",
    contactEmail = "",
    contactPhone = "",
    contactAddress = "",
    tag = "",
    source = "",
    track = "",
    employeeName = "",
    dateSubmitted = "",
    comment = "",
  } = body || {};

  if (!address) {
    return new Response(JSON.stringify({ error: "Address is required." }), {
      status: 400,
    });
  }

  const row = [
    contactType,
    contactTags,
    propertyName,
    address,
    companyName,
    "",
    city,
    units,
    heatingFuel,
    heatingType,
    constructionType,
    roofType,
    "",
    "",
    contactEmail,
    contactPhone,
    contactAddress,
    tag,
    source,
    track,
    "",
    employeeName,
    dateSubmitted,
    comment,
  ];

  try {
    await appendSheetRow(spreadsheetId, row);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to append row." }),
      { status: 500 },
    );
  }
}

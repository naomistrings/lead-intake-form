const EXTRACTION_PROMPT = `You are extracting PROPERTY data from a real estate offering memo for a multifamily property database. Extract only information about the building/property itself — do NOT extract any contact, broker, or company information.

Return ONLY a JSON object (no markdown, no backticks, no explanation) with these exact keys. Use empty string "" for any field you cannot find.

{
  "propertyName": "property or building name",
  "address": "full street address of the property",
  "city": "city name",
  "units": "total number of residential units as a string",
  "heatingFuel": "one of: Natural gas, Oil, #2 fuel oil, #4 fuel oil, #6 fuel oil, Electric, Propane, Unknown",
  "heatingType": "one of: Forced hot air, Hot water baseboard, Steam, Radiant, Heat pump, Electric baseboard, Unknown",
  "constructionType": "one of: Wood frame, Masonry, Steel frame, Concrete, Mixed, Unknown",
  "roofType": "one of: Flat/Built-up, Gable/Shingle, Hip, Mansard, Gambrel, Metal, Rubber membrane, Unknown",
  "contactAddress": "the property's full address including city, state, zip if available",
  "tag": "",
  "source": "Realtor mailing"
}

Important:
- Always leave "tag" as an empty string.
- Always set "source" to "Realtor mailing".
- For heating/construction/roof, pick the closest match from the options listed. Use "Unknown" if unclear.
- If multiple buildings or addresses, use the primary/first one.`;

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  let userContent;

  if (contentType.includes("application/json")) {
    // Text-based PDF: browser extracted the text, just send it as a text message
    const { extractedText } = await request.json();
    userContent = [
      { type: "text", text: `<document>\n${extractedText}\n</document>\n\n${EXTRACTION_PROMPT}` },
    ];
  } else {
    // Scanned PDF or image: send the file via vision
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
    const mediaType = isPdf ? "application/pdf" : (file.type || "image/jpeg");
    userContent = [
      {
        type: isPdf ? "document" : "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      },
      { type: "text", text: EXTRACTION_PROMPT },
    ];
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const data = await resp.json();
  return Response.json(data, { status: resp.status });
}

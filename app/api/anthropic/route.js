export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
      { status: 500 },
    );
  }

  const body = await request.json();
  const { base64, fileName, fileType } = body || {};
  if (!base64 || !fileName || !fileType) {
    return new Response(
      JSON.stringify({ error: "Missing required upload fields." }),
      { status: 400 },
    );
  }

  const isPdf =
    fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const mediaType = isPdf ? "application/pdf" : fileType || "application/pdf";

  const userContent = [];
  userContent.push({
    type: isPdf ? "document" : "image",
    source: { type: "base64", media_type: mediaType, data: base64 },
  });
  userContent.push({
    type: "text",
    text: `You are extracting PROPERTY data from a real estate offering memo for a multifamily property database. Extract only information about the building/property itself — do NOT extract any contact, broker, or company information.

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
- If multiple buildings or addresses, use the primary/first one.`,
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return new Response(
      JSON.stringify({
        error: `Anthropic API error: ${response.status}`,
        details: text,
      }),
      { status: 502 },
    );
  }

  const data = await response.json();
  const textBlocks = Array.isArray(data.content)
    ? data.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("")
    : data?.completion || "";
  const cleaned = String(textBlocks)
    .replace(/```json|```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return new Response(JSON.stringify({ parsed }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to parse Anthropic response as JSON.",
        raw: cleaned,
      }),
      { status: 502 },
    );
  }
}

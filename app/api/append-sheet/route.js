import { appendEntries } from "@/lib/sheets";

export async function POST(request) {
  try {
    const { entries } = await request.json();

    if (!Array.isArray(entries) || entries.length === 0) {
      return Response.json({ error: "No entries provided" }, { status: 400 });
    }

    await appendEntries(entries);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("append-sheet error:", err);
    return Response.json({ error: err.message || "Failed to write to Sheets" }, { status: 500 });
  }
}

import { useState, useRef } from "react";

const TAGS = ["Expected Market Rate", "Expected LEAN"];
const SOURCES = ["Referral", "Drive-by", "Realtor mailing", "Market research", "Other"];
const ROOF_TYPES = ["Flat/Built-up", "Gable/Shingle", "Hip", "Mansard", "Gambrel", "Metal", "Rubber membrane", "Unknown"];
const HEATING_TYPES = ["Forced hot air", "Hot water baseboard", "Steam", "Radiant", "Heat pump", "Electric baseboard", "Unknown"];
const HEATING_FUELS = ["Natural gas", "Oil", "#2 fuel oil", "#4 fuel oil", "#6 fuel oil", "Electric", "Propane", "Unknown"];
const CONSTRUCTION_TYPES = ["Wood frame", "Masonry", "Steel frame", "Concrete", "Mixed", "Unknown"];

const EMPTY_PROPERTY = {
  contactType: "", contactTags: "",
  address: "", city: "", propertyName: "", units: "",
  tag: "", roofType: "", heatingType: "", heatingFuel: "",
  constructionType: "", source: "", contactFirstName: "",
  contactLastName: "", contactEmail: "", contactPhone: "",
  contactAddress: "", companyName: "",
};

const FIELD_MAP = {
  contactType: "Contact Type",
  contactTags: "Contacts: Tags",
  propertyName: "Properties: Property Name",
  address: "Properties: Address",
  companyName: "Companies: Company",
  city: "City",
  units: "Properties: Units",
  heatingFuel: "Properties: Heating Fuel",
  heatingType: "Properties: Heating Type",
  constructionType: "Properties: Construction Type",
  roofType: "Properties: Roof Type",
  contactFirstName: "Contacts: First Name",
  contactLastName: "Contacts: Last Name",
  contactEmail: "Contacts: Email",
  contactPhone: "Contacts: Phone",
  contactAddress: "Contacts: Address",
  tag: "Properties: Tags",
  source: "Source",
};

function csvEscape(v) {
  if (!v) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function buildCsvRow(entry) {
  const cols = [
    entry.contactType, entry.contactTags, entry.propertyName,
    entry.address, entry.companyName, "",
    entry.city, entry.units, entry.heatingFuel, entry.heatingType,
    entry.constructionType, entry.roofType, entry.contactFirstName,
    entry.contactLastName, entry.contactEmail, entry.contactPhone,
    entry.contactAddress, entry.tag, entry.source,
    entry.employeeName || "", entry.dateSubmitted || "", entry.comment || "",
    "Yes",
  ];
  return cols.map(csvEscape).join(",");
}

const CSV_HEADER = [
  "Contact Type", "Contacts: Tags", "Properties: Property Name",
  "Properties: Address", "Companies: Company", "Owner", "City",
  "Properties: Units", "Properties: Heating Fuel", "Properties: Heating Type",
  "Properties: Construction Type", "Properties: Roof Type",
  "Contacts: First Name", "Contacts: Last Name", "Contacts: Email",
  "Contacts: Phone", "Contacts: Address", "Properties: Tags", "Source",
  "Submitted By", "Date Submitted", "Comment", "Tracking",
].map(csvEscape).join(",");

const brand = { yellow: "#FFD10D", blue: "#1691D0", green: "#8AC660" };
const c = {
  bg: "#0f1117", card: "#181b24", border: "#282d3a",
  accent: brand.blue, text: "#e2e4ea", textDim: "#8a8f9e",
  inputBg: "#12141c",
};
const font = "system-ui, sans-serif";

const inputStyle = {
  fontFamily: font, color: c.text, boxSizing: "border-box",
  background: c.inputBg, border: `1px solid ${c.border}`,
  borderRadius: 6, padding: "8px 12px", fontSize: 14, width: "100%", outline: "none",
};
const selectStyle = { ...inputStyle, appearance: "auto" };
const btnPrimary = {
  fontFamily: font, color: "#fff", boxSizing: "border-box",
  background: brand.blue, border: "none", borderRadius: 6,
  padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const btnOutline = {
  ...btnPrimary, background: "transparent",
  border: `1px solid ${c.border}`, color: c.text,
};
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: c.textDim,
  textTransform: "uppercase", letterSpacing: "0.05em",
  marginBottom: 4, display: "block", fontFamily: font,
};

function Field({ label, children, style: s }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", ...s }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select style={selectStyle} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder || "Select..."}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const AI_SKIP_FIELDS = new Set([
  "companyName", "contactType", "contactTags",
  "contactFirstName", "contactLastName", "contactPhone", "contactEmail",
]);

export default function PropertyIntake() {
  const [employeeName, setEmployeeName] = useState("");
  const [comment, setComment] = useState("");
  const [mode, setMode] = useState(null);
  const [property, setProperty] = useState({ ...EMPTY_PROPERTY });
  const [entries, setEntries] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiExtracted, setAiExtracted] = useState(null);
  const fileRef = useRef();

  const dateSubmitted = new Date().toISOString().split("T")[0];
  const set = (k) => (v) => setProperty(p => ({ ...p, [k]: v }));

  function addManualEntry() {
    if (!property.address) return;
    setEntries(prev => [...prev, { ...property, employeeName, dateSubmitted, comment }]);
    setProperty({ ...EMPTY_PROPERTY });
  }

  function acceptAiEntry() {
    if (!aiExtracted) return;
    setEntries(prev => [...prev, { ...aiExtracted, employeeName, dateSubmitted, comment }]);
    setAiExtracted(null); setAiStatus(null); setAiMessage("");
  }

  function downloadCsv() {
    const rows = [CSV_HEADER, ...entries.map(buildCsvRow)].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `property_leads_${dateSubmitted}.csv`;
    a.click();
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiStatus("loading");
    setAiMessage("Reading file...");
    setAiExtracted(null);

    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Failed to read file"));
        r.readAsDataURL(file);
      });

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const mediaType = isPdf ? "application/pdf" : file.type || "image/jpeg";

      setAiMessage("Extracting property data...");

      const userContent = [];
      if (isPdf) {
        userContent.push({ type: "document", source: { type: "base64", media_type: mediaType, data: base64 } });
      } else {
        userContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
      }

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

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!resp.ok) throw new Error(`API error ${resp.status}: ${await resp.text()}`);

      const data = await resp.json();
      const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

      const result = { ...EMPTY_PROPERTY };
      for (const k of Object.keys(EMPTY_PROPERTY)) {
        if (AI_SKIP_FIELDS.has(k)) continue;
        if (parsed[k]) result[k] = parsed[k];
      }

      setAiExtracted(result);
      setAiStatus("done");
      setAiMessage("Extraction complete — review below.");
    } catch (err) {
      setAiStatus("error");
      setAiMessage(err.message || "Something went wrong");
    }
  }

  function removeEntry(i) {
    setEntries(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ fontFamily: font, color: c.text, background: c.bg, minHeight: "100vh", padding: "32px 24px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: font, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: brand.yellow }}>
            Lead Intake
          </h1>
          <p style={{ fontFamily: font, color: c.textDim, margin: "6px 0 0", fontSize: 14 }}>
            See a building we should be serving?
          </p>
        </div>

        <div style={{
          background: c.card, borderRadius: 10, border: `1px solid ${c.border}`,
          padding: 20, marginBottom: 20,
          display: "grid", gridTemplateColumns: "1fr", gap: 16,
        }}>
          <Field label="Your name">
            <input style={inputStyle} value={employeeName}
              onChange={e => setEmployeeName(e.target.value)} placeholder="First Last" />
          </Field>
          <Field label="Comment / reason this is a lead">
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Why is this property worth pursuing?" />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {[["manual", "Enter manually"], ["upload", "Upload offering memo"]].map(([key, lbl]) => (
            <button key={key}
              style={{ ...(mode === key ? btnPrimary : btnOutline), flex: 1, transition: "all 0.15s" }}
              onClick={() => { setMode(key); setAiStatus(null); setAiExtracted(null); }}>
              {lbl}
            </button>
          ))}
        </div>

        {mode === "manual" && (
          <div style={{ background: c.card, borderRadius: 10, border: `1px solid ${c.border}`, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Address *" style={{ gridColumn: "1 / -1" }}>
                <input style={inputStyle} value={property.address}
                  onChange={e => set("address")(e.target.value)} placeholder="123 Main St" />
              </Field>
              <Field label="City">
                <input style={inputStyle} value={property.city}
                  onChange={e => set("city")(e.target.value)} placeholder="Boston" />
              </Field>
              <Field label="Property name">
                <input style={inputStyle} value={property.propertyName}
                  onChange={e => set("propertyName")(e.target.value)} />
              </Field>
              <Field label="Units">
                <input style={inputStyle} value={property.units}
                  onChange={e => set("units")(e.target.value)} placeholder="24" />
              </Field>
              <Field label="Property tag">
                <Select value={property.tag} onChange={set("tag")} options={TAGS} />
              </Field>
              <Field label="Roof type">
                <Select value={property.roofType} onChange={set("roofType")} options={ROOF_TYPES} />
              </Field>
              <Field label="Heating type">
                <Select value={property.heatingType} onChange={set("heatingType")} options={HEATING_TYPES} />
              </Field>
              <Field label="Heating fuel">
                <Select value={property.heatingFuel} onChange={set("heatingFuel")} options={HEATING_FUELS} />
              </Field>
              <Field label="Construction type">
                <Select value={property.constructionType} onChange={set("constructionType")} options={CONSTRUCTION_TYPES} />
              </Field>
              <Field label="Lead source">
                <Select value={property.source} onChange={set("source")} options={SOURCES} />
              </Field>
              <Field label="Owner / Property Manager">
                <input style={inputStyle} value={property.companyName}
                  onChange={e => set("companyName")(e.target.value)} />
              </Field>
            </div>
            <button style={{ ...btnPrimary, marginTop: 20, width: "100%", background: brand.green, color: "#1a1a1a" }}
              onClick={addManualEntry} disabled={!property.address}>
              🎯 Send it to sales!
            </button>
          </div>
        )}

        {mode === "upload" && (
          <div style={{ background: c.card, borderRadius: 10, border: `1px solid ${c.border}`, padding: 20, marginBottom: 20 }}>
            <input ref={fileRef} type="file" accept=".pdf,image/*"
              style={{ display: "none" }} onChange={handleFileUpload} />

            {!aiStatus && (
              <div onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${c.border}`, borderRadius: 8, padding: "40px 20px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <div style={{ fontFamily: font, fontWeight: 600, marginBottom: 4 }}>Click to upload an offering memo</div>
                <div style={{ fontFamily: font, fontSize: 13, color: c.textDim }}>PDF or image — Claude will extract property data</div>
              </div>
            )}

            {aiStatus === "loading" && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <div style={{
                  width: 32, height: 32, border: `3px solid ${c.border}`,
                  borderTopColor: brand.blue, borderRadius: "50%",
                  margin: "0 auto 12px", animation: "spin 0.8s linear infinite",
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                <div style={{ fontFamily: font, color: c.textDim, fontSize: 14 }}>{aiMessage}</div>
              </div>
            )}

            {aiStatus === "error" && (
              <div style={{ padding: 20 }}>
                <div style={{ color: "#f87171", fontFamily: font, fontSize: 13, marginBottom: 12 }}>{aiMessage}</div>
                <button style={btnOutline} onClick={() => { setAiStatus(null); fileRef.current.value = ""; }}>Try again</button>
              </div>
            )}

            {aiStatus === "done" && aiExtracted && (
              <div>
                <div style={{ fontFamily: font, fontWeight: 600, marginBottom: 16, color: brand.green }}>
                  ✓ {aiMessage}
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
                  background: c.inputBg, borderRadius: 8, padding: 16, marginBottom: 16,
                  fontSize: 13, fontFamily: font,
                }}>
                  {Object.entries(FIELD_MAP).map(([k, lbl]) => {
                    if (!aiExtracted[k] || AI_SKIP_FIELDS.has(k)) return null;
                    return (
                      <div key={k} style={{ padding: "4px 0" }}>
                        <span style={{ color: c.textDim }}>{lbl}: </span>
                        <span style={{ fontWeight: 500 }}>{aiExtracted[k]}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ ...btnPrimary, flex: 1, background: brand.green, color: "#1a1a1a" }} onClick={acceptAiEntry}>
                    🎯 Send it to sales!
                  </button>
                  <button style={btnOutline}
                    onClick={() => { setAiStatus(null); setAiExtracted(null); fileRef.current.value = ""; }}>
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {entries.length > 0 && (
          <div style={{ background: c.card, borderRadius: 10, border: `1px solid ${c.border}`, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: font, fontSize: 16, fontWeight: 600, margin: 0 }}>
                Batch ({entries.length} {entries.length === 1 ? "property" : "properties"})
              </h2>
              <button style={{ ...btnPrimary, background: brand.green, color: "#1a1a1a" }} onClick={downloadCsv}>
                ↓ Download CSV
              </button>
            </div>
            {entries.map((ent, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", borderRadius: 6,
                background: i % 2 ? "transparent" : c.inputBg,
                fontSize: 13, fontFamily: font,
              }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{ent.address}</span>
                  {ent.city && <span style={{ color: c.textDim }}>, {ent.city}</span>}
                  {ent.units && <span style={{ color: c.textDim }}> · {ent.units} units</span>}
                  {ent.tag && <span style={{
                    marginLeft: 8, fontSize: 11, padding: "2px 8px",
                    borderRadius: 99, background: `${brand.yellow}22`, color: brand.yellow,
                  }}>{ent.tag}</span>}
                </div>
                <button onClick={() => removeEntry(i)}
                  style={{ background: "none", border: "none", color: c.textDim, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

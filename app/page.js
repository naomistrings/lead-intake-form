"use client";

import { useState, useRef } from "react";

const BRAND = { yellow: "#FFD10D", blue: "#1691D0", green: "#8AC660" };
const PALETTE = {
  bg: "#0f1117",
  card: "#181b24",
  border: "#282d3a",
  text: "#e2e4ea",
  textDim: "#8a8f9e",
  inputBg: "#12141c",
};
const font = "system-ui, sans-serif";

const SOURCE_OPTIONS = [
  "Referral",
  "Drive-by",
  "Realtor mailing",
  "Market research",
  "Other",
];

const ROOF_TYPES = [
  "Flat/Built-up",
  "Gable/Shingle",
  "Hip",
  "Mansard",
  "Gambrel",
  "Metal",
  "Rubber membrane",
  "Unknown",
];

const HEATING_TYPES = [
  "Forced hot air",
  "Hot water baseboard",
  "Steam",
  "Radiant",
  "Heat pump",
  "Electric baseboard",
  "Unknown",
];

const HEATING_FUELS = [
  "Natural gas",
  "Oil",
  "#2 fuel oil",
  "#4 fuel oil",
  "#6 fuel oil",
  "Electric",
  "Propane",
  "Unknown",
];

const CONSTRUCTION_TYPES = [
  "Wood frame",
  "Masonry",
  "Steel frame",
  "Concrete",
  "Mixed",
  "Unknown",
];

const INCENTIVE_OPTIONS = [
  { value: "Expected Market Rate", label: "Market Rate" },
  { value: "Expected LEAN", label: "LEAN" },
];

const EMPLOYEE_NAMES = [
  "Aadi",
  "Abby",
  "Adam",
  "Alex",
  "Brian",
  "Brendan",
  "Colln",
  "Jamie",
  "Jim",
  "JD",
  "Kelly",
  "Kendra",
  "Lindsey",
  "Marty",
  "Mike",
  "Naomi",
  "Nicholas",
  "Pat",
  "Phillip",
  "Ryan",
  "Tom C",
  "Tom F",
  "Tom S",
];

const EMPTY_PROPERTY = {
  address: "",
  city: "",
  propertyName: "",
  units: "",
  tag: "",
  roofType: "",
  heatingType: "",
  heatingFuel: "",
  constructionType: "",
  source: "",
  companyName: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
};

const inputStyle = {
  fontFamily: font,
  color: PALETTE.text,
  boxSizing: "border-box",
  background: PALETTE.inputBg,
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};
const selectStyle = { ...inputStyle, appearance: "auto" };
const btnPrimary = {
  fontFamily: font,
  color: "#fff",
  background: BRAND.blue,
  border: "none",
  borderRadius: 8,
  padding: "12px 18px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
const btnOutline = {
  ...btnPrimary,
  background: "transparent",
  border: `1px solid ${PALETTE.border}`,
  color: PALETTE.text,
};
const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: PALETTE.textDim,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
  display: "block",
  fontFamily: font,
};

function Field({ label, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      style={selectStyle}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder || "Select..."}</option>
      {options.map((option) => (
        <option key={option.value ?? option} value={option.value ?? option}>
          {option.label ?? option}
        </option>
      ))}
    </select>
  );
}

export default function HomePage() {
  const [employeeName, setEmployeeName] = useState("");
  const [comment, setComment] = useState("");
  const [mode, setMode] = useState("manual");
  const [property, setProperty] = useState({ ...EMPTY_PROPERTY });
  const [entries, setEntries] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiExtracted, setAiExtracted] = useState(null);
  const [operationMessage, setOperationMessage] = useState("");
  const [purgeMessage, setPurgeMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const fileRef = useRef(null);

  const dateSubmitted = new Date().toISOString().split("T")[0];
  const setField = (key) => (value) =>
    setProperty((prev) => ({ ...prev, [key]: value }));

  async function appendToSheet(payload) {
    setIsSubmitting(true);
    setOperationMessage("Sending row to Google Sheets...");

    try {
      const response = await fetch("/api/append-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Append failed");
      }
      setEntries((prev) => [{ ...payload, id: Date.now() }, ...prev]);
      setOperationMessage("Row appended successfully.");
    } catch (error) {
      setOperationMessage(`Failed to append row: ${error.message}`);
      throw error;
    } finally {
      setIsSubmitting(false);
      window.setTimeout(() => setOperationMessage(""), 4000);
    }
  }

  async function handleManualSubmit() {
    if (!property.address) {
      setOperationMessage("Address is required.");
      return;
    }
    if (!employeeName) {
      setOperationMessage("Select your name from the dropdown.");
      return;
    }

    const payload = {
      ...property,
      contactType: "",
      contactTags: "",
      employeeName,
      dateSubmitted,
      comment,
      track: "",
    };

    try {
      await appendToSheet(payload);
      setProperty({ ...EMPTY_PROPERTY });
      setComment("");
    } catch {
      // error handled in appendToSheet
    }
  }

  async function handlePurgeRows() {
    const confirmed = window.confirm(
      "Purge rows older than 30 days from the configured Google Sheet? This cannot be undone.",
    );
    if (!confirmed) return;

    setIsPurging(true);
    setPurgeMessage("Purging old rows...");

    try {
      const response = await fetch("/api/purge-old", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Purge failed");
      }
      setPurgeMessage(`Purged ${data.deletedRows} row(s) older than 30 days.`);
    } catch (error) {
      setPurgeMessage(`Purge failed: ${error.message}`);
    } finally {
      setIsPurging(false);
      window.setTimeout(() => setPurgeMessage(""), 6000);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAiStatus("loading");
    setAiMessage("Reading file...");
    setAiExtracted(null);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result || "";
          resolve(result.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("Unable to read the file."));
        reader.readAsDataURL(file);
      });

      setAiMessage("Extracting property data...");
      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64,
          fileName: file.name,
          fileType: file.type,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not valid JSON, get the text instead
        const text = await response.text();
        throw new Error(
          `API error (${response.status}): ${text.substring(0, 200)}`,
        );
      }

      if (!response.ok) {
        throw new Error(data?.error || `API error (${response.status})`);
      }
      if (!data.parsed) {
        throw new Error(data?.error || "No extracted data returned.");
      }

      setAiExtracted({ ...EMPTY_PROPERTY, ...data.parsed });
      setAiStatus("done");
      setAiMessage("Extraction complete. Review the extracted property data.");
    } catch (error) {
      setAiStatus("error");
      setAiMessage(error.message || "Unable to extract the file.");
    }
  }

  async function acceptAiData() {
    if (!aiExtracted) return;
    if (!employeeName) {
      setOperationMessage("Select your name before sending AI data.");
      return;
    }

    const payload = {
      ...aiExtracted,
      contactType: "",
      contactTags: "",
      employeeName,
      dateSubmitted,
      comment,
      track: "Yes",
    };

    try {
      await appendToSheet(payload);
      setAiExtracted(null);
      setAiStatus(null);
      setAiMessage("");
      setComment("");
    } catch {
      // handled above
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PALETTE.bg,
        color: PALETTE.text,
        padding: "32px 24px",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <header style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: font,
              fontSize: 34,
              margin: 0,
              color: BRAND.yellow,
            }}
          >
            Lead Intake
          </h1>
          <p style={{ color: PALETTE.textDim, marginTop: 8, fontSize: 15 }}>
            Submit one or more properties to Google Sheets with manual entry or
            AI extraction from offering memos.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 18,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              style={{
                ...btnOutline,
                minWidth: 190,
                background: isPurging ? PALETTE.inputBg : "transparent",
              }}
              onClick={handlePurgeRows}
              disabled={isPurging}
            >
              {isPurging ? "Purging..." : "Purge rows older than 30 days"}
            </button>
            {purgeMessage && (
              <div style={{ color: PALETTE.textDim, fontSize: 13 }}>
                {purgeMessage}
              </div>
            )}
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gap: 18,
            marginBottom: 24,
            background: PALETTE.card,
            borderRadius: 16,
            border: `1px solid ${PALETTE.border}`,
            padding: 24,
          }}
        >
          <Field label="Your name">
            <Select
              value={employeeName}
              onChange={setEmployeeName}
              options={EMPLOYEE_NAMES.map((name) => ({
                value: name,
                label: name,
              }))}
              placeholder="Select your name"
            />
          </Field>
          <Field label="Comment / reason this is a lead">
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Why is this property worth pursuing?"
            />
          </Field>
          {operationMessage && (
            <div
              style={{
                color: operationMessage.startsWith("Failed")
                  ? "#f87171"
                  : BRAND.green,
                fontSize: 13,
              }}
            >
              {operationMessage}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          {[
            ["manual", "Enter manually"],
            ["upload", "Upload offering memo"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              style={{
                ...(mode === key
                  ? { ...btnPrimary, background: BRAND.green, color: "#111" }
                  : btnOutline),
                flex: 1,
              }}
              onClick={() => {
                setMode(key);
                setAiStatus(null);
                setAiExtracted(null);
                setAiMessage("");
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "manual" && (
          <div
            style={{
              background: PALETTE.card,
              borderRadius: 16,
              border: `1px solid ${PALETTE.border}`,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <Field label="Address *" style={{ gridColumn: "1 / -1" }}>
                <input
                  style={inputStyle}
                  value={property.address}
                  onChange={(event) => setField("address")(event.target.value)}
                  placeholder="123 Main St"
                />
              </Field>
              <Field label="City">
                <input
                  style={inputStyle}
                  value={property.city}
                  onChange={(event) => setField("city")(event.target.value)}
                  placeholder="Boston"
                />
              </Field>
              <Field label="Property name">
                <input
                  style={inputStyle}
                  value={property.propertyName}
                  onChange={(event) =>
                    setField("propertyName")(event.target.value)
                  }
                />
              </Field>
              <Field label="Units">
                <input
                  style={inputStyle}
                  value={property.units}
                  onChange={(event) => setField("units")(event.target.value)}
                  placeholder="24"
                />
              </Field>
              <Field label="Expected Incentive Program?">
                <Select
                  value={property.tag}
                  onChange={setField("tag")}
                  options={INCENTIVE_OPTIONS}
                  placeholder="Select incentive program"
                />
              </Field>
              <Field label="Lead source">
                <Select
                  value={property.source}
                  onChange={setField("source")}
                  options={SOURCE_OPTIONS}
                  placeholder="Select source"
                />
              </Field>
            </div>
            <button
              type="button"
              style={{
                ...btnPrimary,
                marginTop: 24,
                width: "100%",
                background: BRAND.green,
                color: "#fff",
              }}
              onClick={handleManualSubmit}
              disabled={isSubmitting}
            >
              🎯 Send it to sales
            </button>
          </div>
        )}

        {mode === "upload" && (
          <div
            style={{
              background: PALETTE.card,
              borderRadius: 16,
              border: `1px solid ${PALETTE.border}`,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />

            {!aiStatus && (
              <div
                role="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  cursor: "pointer",
                  border: `2px dashed ${PALETTE.border}`,
                  borderRadius: 16,
                  padding: "48px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 34, marginBottom: 10 }}>📄</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  Upload an offering memo
                </div>
                <div style={{ color: PALETTE.textDim, fontSize: 14 }}>
                  PDF or image — Claude will extract property data.
                </div>
              </div>
            )}

            {aiStatus === "loading" && (
              <div style={{ textAlign: "center", padding: 30 }}>
                <div
                  style={{
                    margin: "0 auto 14px",
                    width: 32,
                    height: 32,
                    border: `3px solid ${PALETTE.border}`,
                    borderTopColor: BRAND.blue,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <div style={{ color: PALETTE.textDim }}>{aiMessage}</div>
              </div>
            )}

            {aiStatus === "error" && (
              <div style={{ padding: 18 }}>
                <div style={{ color: "#f87171", marginBottom: 16 }}>
                  {aiMessage}
                </div>
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => {
                    setAiStatus(null);
                    setAiMessage("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {aiStatus === "done" && aiExtracted && (
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 16,
                    color: BRAND.green,
                  }}
                >
                  ✓ {aiMessage}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    background: PALETTE.inputBg,
                    padding: 18,
                    borderRadius: 14,
                    marginBottom: 18,
                  }}
                >
                  {Object.entries({
                    "Property name": aiExtracted.propertyName,
                    Address: aiExtracted.address,
                    City: aiExtracted.city,
                    Units: aiExtracted.units,
                    "Roof type": aiExtracted.roofType,
                    "Heating type": aiExtracted.heatingType,
                    "Heating fuel": aiExtracted.heatingFuel,
                    Construction: aiExtracted.constructionType,
                    Source: aiExtracted.source,
                    "Contact address": aiExtracted.contactAddress,
                  }).map(([label, value]) => (
                    <div key={label}>
                      <div style={{ color: PALETTE.textDim, fontSize: 12 }}>
                        {label}
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        {value || "—"}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={{
                      ...btnPrimary,
                      flex: 1,
                      background: BRAND.green,
                      color: "#111",
                    }}
                    onClick={acceptAiData}
                    disabled={isSubmitting}
                  >
                    🎯 Send it to sales
                  </button>
                  <button
                    type="button"
                    style={{ ...btnOutline, flex: 1 }}
                    onClick={() => {
                      setAiStatus(null);
                      setAiExtracted(null);
                      setAiMessage("");
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {entries.length > 0 && (
          <div
            style={{
              background: PALETTE.card,
              borderRadius: 16,
              border: `1px solid ${PALETTE.border}`,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Recently sent addresses
              </h2>
              <span style={{ color: PALETTE.textDim, fontSize: 13 }}>
                {entries.length} appended
              </span>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    background: PALETTE.inputBg,
                    borderRadius: 12,
                    padding: 16,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {entry.address || "Untitled property"}
                  </div>
                  <div style={{ color: PALETTE.textDim, fontSize: 13 }}>
                    {entry.city ? `${entry.city} · ` : ""}
                    {entry.units ? `${entry.units} units · ` : ""}
                    {entry.tag ? `${entry.tag} · ` : ""}
                    {entry.source}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// import React, { useEffect, useState } from "react";

// const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

// export default function App() {
//   const [file, setFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [docs, setDocs] = useState([]);
//   const [q, setQ] = useState("");
//   const [results, setResults] = useState([]);
//   const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000000"); // demo

//   async function loadHistory() {
//     const res = await fetch(`${API_BASE}/history?user_id=${userId}`);
//     const json = await res.json();
//     setDocs(json.documents || []);
//   }

//   useEffect(() => {
//     loadHistory();
//   }, []);

//   async function onUpload(e) {
//     e.preventDefault();
//     if (!file) return;
//     setUploading(true);
//     const fd = new FormData();
//     fd.append("file", file);
//     fd.append("user_id", userId);
//     const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
//     const json = await res.json();
//     setUploading(false);
//     setFile(null);
//     await loadHistory();
//     alert(json.error ? `Upload failed: ${json.error}` : "Uploaded & indexed!");
//   }

//   async function onSearch(e) {
//     e.preventDefault();
//     if (!q) return;
//     const res = await fetch(
//       `${API_BASE}/search?q=${encodeURIComponent(q)}&topK=5`
//     );
//     const json = await res.json();
//     setResults(json.results || []);
//   }

//   return (
//     <div
//       style={{
//         maxWidth: 900,
//         margin: "40px auto",
//         fontFamily: "Inter, system-ui, sans-serif",
//       }}
//     >
//       <h1>Document Ingest & Vector Index</h1>

//       <section
//         style={{
//           padding: 16,
//           border: "1px solid #ddd",
//           borderRadius: 10,
//           marginBottom: 24,
//         }}
//       >
//         <h3>Upload a document</h3>
//         <form onSubmit={onUpload}>
//           <input
//             type="file"
//             onChange={(e) => setFile(e.target.files?.[0] || null)}
//           />
//           <button
//             type="submit"
//             disabled={uploading || !file}
//             style={{ marginLeft: 12 }}
//           >
//             {uploading ? "Uploading…" : "Upload & Index"}
//           </button>
//         </form>
//         <p style={{ color: "#666", marginTop: 8 }}>
//           Supports PDF, DOCX, TXT. Stored in Supabase; chunks embedded to
//           pgvector.
//         </p>
//       </section>

//       <section
//         style={{
//           padding: 16,
//           border: "1px solid #ddd",
//           borderRadius: 10,
//           marginBottom: 24,
//         }}
//       >
//         <h3>Upload History</h3>
//         {!docs.length && <div>No documents yet.</div>}
//         <ul>
//           {docs.map((d) => (
//             <li key={d.id}>
//               {/* <b>{d.file_name}</b> — {new Date(d.uploaded_at).toLocaleString()} (mime: {d.mime_type || 'n/a'}) */}
//               <a href={d.file_url} target="_blank" rel="noopener noreferrer">
//                 {d.file_name}
//               </a>{" "}
//               — {new Date(d.uploaded_at).toLocaleString()} (mime:{" "}
//               {d.mime_type || "n/a"})
//             </li>
//           ))}
//         </ul>
//       </section>

//       <section
//         style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10 }}
//       >
//         <h3>Semantic Search</h3>
//         <form onSubmit={onSearch}>
//           <input
//             value={q}
//             onChange={(e) => setQ(e.target.value)}
//             placeholder="Ask about your docs…"
//             style={{ width: 400 }}
//           />
//           <button type="submit" style={{ marginLeft: 12 }}>
//             Search
//           </button>
//         </form>
//         <ol>
//           {results.map((r) => (
//             <li key={`${r.id}-${r.chunk_index}`}>
//               <div>
//                 <b>Similarity:</b> {r.similarity?.toFixed(3)}
//               </div>
//               <div style={{ whiteSpace: "pre-wrap" }}>{r.content}</div>
//             </li>
//           ))}
//         </ol>
//       </section>
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000000"); // demo
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedText, setSelectedText] = useState("");

  async function loadHistory() {
    const res = await fetch(`${API_BASE}/history?user_id=${userId}`);
    const json = await res.json();
    setDocs(json.documents || []);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function onUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("user_id", userId);
    const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    setFile(null);
    await loadHistory();
    alert(json.error ? `Upload failed: ${json.error}` : "Uploaded & indexed!");
  }

  async function onSearch(e) {
    e.preventDefault();
    if (!q) return;
    const res = await fetch(
      `${API_BASE}/search?q=${encodeURIComponent(q)}&topK=5`
    );
    const json = await res.json();
    setResults(json.results || []);
  }

  async function onViewText(doc) {
    setSelectedDoc(doc);
    setSelectedText("Loading…");
    try {
      const res = await fetch(`${API_BASE}/document/${doc.id}/text`);
      const json = await res.json();
      setSelectedText(json.text || "No text available");
    } catch (err) {
      setSelectedText("Error fetching text");
    }
  }

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "40px auto",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <h1>Document Ingest & Vector Index</h1>

      {/* Upload Section */}
      <section
        style={{
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 10,
          marginBottom: 24,
        }}
      >
        <h3>Upload a document</h3>
        <form onSubmit={onUpload}>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            type="submit"
            disabled={uploading || !file}
            style={{ marginLeft: 12 }}
          >
            {uploading ? "Uploading…" : "Upload & Index"}
          </button>
        </form>
        <p style={{ color: "#666", marginTop: 8 }}>
          Supports PDF, DOCX, TXT. Stored in Supabase; chunks embedded to
          pgvector.
        </p>
      </section>

      {/* History Section */}
      <section
        style={{
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 10,
          marginBottom: 24,
        }}
      >
        <h3>Upload History</h3>
        {!docs.length && <div>No documents yet.</div>}
        <ul>
          {docs.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => onViewText(d)}
                style={{
                  background: "none",
                  border: "none",
                  color: "blue",
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 0,
                  marginRight: 8,
                }}
              >
                {d.file_name}
              </button>
              — {new Date(d.uploaded_at).toLocaleString()} (mime:{" "}
              {d.mime_type || "n/a"})
            </li>
          ))}
        </ul>

        {selectedDoc && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              border: "1px solid #eee",
              borderRadius: 8,
              background: "#fafafa",
              maxHeight: 400,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            <h4>{selectedDoc.file_name} (Plain Text)</h4>
            <div>{selectedText}</div>
          </div>
        )}
      </section>

      {/* Search Section */}
      <section
        style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10 }}
      >
        <h3>Semantic Search</h3>
        <form onSubmit={onSearch}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask about your docs…"
            style={{ width: 400 }}
          />
          <button type="submit" style={{ marginLeft: 12 }}>
            Search
          </button>
        </form>
        <ol>
          {results.map((r) => (
            <li key={`${r.id}-${r.chunk_index}`}>
              <div>
                <b>Similarity:</b>{" "}
                {r.similarity ? r.similarity.toFixed(3) : r.score?.toFixed(3)}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{r.content}</div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

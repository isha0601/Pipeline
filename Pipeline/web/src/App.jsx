import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [userId, setUserId] = useState('00000000-0000-0000-0000-000000000000'); // demo
  const [previewDoc, setPreviewDoc] = useState(null); // { id, file_name }
  const [previewText, setPreviewText] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  async function loadHistory() {
    const res = await fetch(`${API_BASE}/history?user_id=${userId}`);
    const json = await res.json();
    setDocs(json.documents || []);
  }

  useEffect(() => { loadHistory(); }, []);

  async function onUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('user_id', userId);
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd });
    const json = await res.json();
    setUploading(false);
    setFile(null);
    await loadHistory();
    alert(json.error ? `Upload failed: ${json.error}` : 'Uploaded & indexed!');
  }

  async function onSearch(e) {
    e.preventDefault();
    if (!q) return;
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}&topK=5`);
    const json = await res.json();
    setResults(json.results || []);
  }

  async function openPreview(doc) {
    try {
      setLoadingPreview(true);
      setPreviewDoc({ id: doc.id, file_name: doc.file_name });
      const res = await fetch(`${API_BASE}/documents/${doc.id}/text`);
      const text = await res.text();
      setPreviewText(text || '(no text)');
    } catch (e) {
      setPreviewText(`Failed to load preview: ${e.message || e}`);
    } finally {
      setLoadingPreview(false);
    }
  }

  function closePreview() {
    setPreviewDoc(null);
    setPreviewText('');
    setLoadingPreview(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1>Document Ingest & Vector Index</h1>

      <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 10, marginBottom: 24 }}>
        <h3>Upload a document</h3>
        <form onSubmit={onUpload}>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          <button type="submit" disabled={uploading || !file} style={{ marginLeft: 12 }}>
            {uploading ? 'Uploading…' : 'Upload & Index'}
          </button>
        </form>
        <p style={{ color: '#666', marginTop: 8 }}>Supports PDF, DOCX, TXT. Stored in Supabase; chunks embedded to pgvector.</p>
      </section>

      <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 10, marginBottom: 24 }}>
        <h3>Upload History</h3>
        {!docs.length && <div>No documents yet.</div>}
        <ul>
          {docs.map(d => (
            <li key={d.id}>
{/*               <b>{d.file_name}</b> — {new Date(d.uploaded_at).toLocaleString()} (mime: {d.mime_type || 'n/a'}) */}
               <a href={d.file_url} target="_blank" rel="noopener noreferrer">
          {d.file_name}
        </a>{" "}
        — {new Date(d.uploaded_at).toLocaleString()} (mime: {d.mime_type || 'n/a'})
        <button style={{ marginLeft: 12 }} onClick={() => openPreview(d)}>Preview</button>
      </li>
          ))}
        </ul>
      </section>

      <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 10 }}>
        <h3>Semantic Search</h3>
        <form onSubmit={onSearch}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about your docs…" style={{ width: 400 }} />
          <button type="submit" style={{ marginLeft: 12 }}>Search</button>
        </form>
        <ol>
          {results.map(r => (
            <li key={`${r.id}-${r.chunk_index}`}>
              <div><b>Similarity:</b> {r.similarity?.toFixed(3)}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{r.content}</div>
            </li>
          ))}
        </ol>
      </section>

      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={closePreview}>
          <div style={{ background: '#fff', borderRadius: 10, width: 'min(900px, 90vw)', maxHeight: '85vh', overflow: 'auto', padding: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Preview: {previewDoc.file_name}</h3>
              <button onClick={closePreview}>Close</button>
            </div>
            {loadingPreview ? (
              <div>Loading…</div>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{previewText}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


import supabase from "./supabase.js";
import { extractText, chunkText } from "./text.js";
import fs from "fs/promises";
import { OpenAI } from "openai";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function storeFileToSupabase(tmpPath, fileName, mime) {
  const fileBuffer = await fs.readFile(tmpPath);
  const storagePath = `${crypto.randomUUID()}/${fileName}`;

  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mime,
      upsert: false,
    });

  if (error) throw error;
  return storagePath;
}

export async function insertDocumentRecord({
  user_id,
  file_name,
  storage_path,
  mime_type,
  size_bytes,
}) {
  const { data, error } = await supabase
    .from("documents")
    .insert([{ user_id, file_name, storage_path, mime_type, size_bytes }])
    .select()
    .single();

  if (error) throw error;
  return data; // returns row with id
}

export async function embedTexts(texts) {
  // returns array of vectors
  const model = process.env.EMBEDDING_MODEL || "small";
  const res = await openai.embeddings.create({
    model,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function processAndIndex({
  tmpPath,
  fileName,
  mime,
  sizeBytes,
  userId,
}) {
  // 1) store raw file
  const storage_path = await storeFileToSupabase(tmpPath, fileName, mime);

  // 2) create document row
  const doc = await insertDocumentRecord({
    user_id: userId || null,
    file_name: fileName,
    storage_path,
    mime_type: mime,
    size_bytes: sizeBytes,
  });

  // 3) extract -> chunk -> embed
  const fullText = await extractText(tmpPath, mime);
  const chunks = chunkText(fullText);

  if (chunks.length === 0) return doc;

  const vectors = await embedTexts(chunks);

  // 4) insert chunks with embeddings
  const rows = chunks.map((content, i) => ({
    document_id: doc.id,
    chunk_index: i,
    content,
    embedding: vectors[i], // supabase-js will cast array->vector
  }));

  const { error } = await supabase.from("doc_chunks").insert(rows);
  if (error) throw error;

  return doc;
}

export async function listHistory({ userId }) {
  const q = supabase
    .from("documents")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (userId) q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function semanticSearch({ query, topK = 5, documentId = null }) {
  const [emb] = await embedTexts([query]);
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: emb,
    match_count: topK,
    p_document_id: documentId ?? null,
  });
  if (error) throw error;
  return data;
}

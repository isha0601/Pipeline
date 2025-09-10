// import supabase from "./supabase.js";
// import { extractText, chunkText } from "./text.js";
// import fs from "fs/promises";
// import { OpenAI } from "openai";
// import path from "path";
// import pinecone from "./pinecone.js";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function storeFileToSupabase(tmpPath, fileName, mime) {
//   const fileBuffer = await fs.readFile(tmpPath);
//   const storagePath = `${crypto.randomUUID()}/${fileName}`;

//   const { error } = await supabase.storage
//     .from(process.env.SUPABASE_BUCKET)
//     .upload(storagePath, fileBuffer, {
//       contentType: mime,
//       upsert: false,
//     });

//   if (error) throw error;
//   return storagePath;
// }

// export async function insertDocumentRecord({
//   user_id,
//   file_name,
//   storage_path,
//   mime_type,
//   size_bytes,
// }) {
//   const { data, error } = await supabase
//     .from("documents")
//     .insert([{ user_id, file_name, storage_path, mime_type, size_bytes }])
//     .select()
//     .single();

//   if (error) throw error;
//   return data; // returns row with id
// }

// export async function embedTexts(texts) {
//   // returns array of vectors
//   const model = process.env.EMBEDDING_MODEL || "small";
//   const res = await openai.embeddings.create({
//     model,
//     input: texts,
//   });
//   return res.data.map((d) => d.embedding);
// }

// export async function processAndIndex({
//   tmpPath,
//   fileName,
//   mime,
//   sizeBytes,
//   userId,
// }) {
//   // 1) store raw file
//   const storage_path = await storeFileToSupabase(tmpPath, fileName, mime);

//   // 2) create document row
//   const doc = await insertDocumentRecord({
//     user_id: userId || null,
//     file_name: fileName,
//     storage_path,
//     mime_type: mime,
//     size_bytes: sizeBytes,
//   });

//   // 3) extract -> chunk -> embed
//   const fullText = await extractText(tmpPath, mime);
//   const chunks = chunkText(fullText);

//   if (chunks.length === 0) return doc;

//   const vectors = await embedTexts(chunks);

//   // 4) insert chunks with embeddings
//   const rows = chunks.map((content, i) => ({
//     document_id: doc.id,
//     chunk_index: i,
//     content,
//     embedding: vectors[i], // supabase-js will cast array->vector
//   }));

//   const { error } = await supabase.from("doc_chunks").insert(rows);
//   if (error) throw error;

//   return doc;
// }

// // export async function listHistory({ userId }) {
// // const q = supabase
// // .from("documents")
// // .select("*")
// // .order("uploaded_at", { ascending: false });
// // if (userId) q.eq("user_id", userId);
// // const { data, error } = await q;
// // if (error) throw error;
// // return data;
// // }

// export async function listHistory({ userId }) {
//   const q = supabase
//     .from("documents")
//     .select("*")
//     .order("uploaded_at", { ascending: false });
//   if (userId) q.eq("user_id", userId);

//   const { data, error } = await q;
//   if (error) throw error;

//   // Add signed URL for each file (valid for 1 hour)
//   const docsWithUrls = await Promise.all(
//     data.map(async (doc) => {
//       const { data: signed, error: signedError } = await supabase.storage
//         .from(process.env.SUPABASE_BUCKET)
//         .createSignedUrl(doc.storage_path, 60 * 60); // 1 hour
//       if (signedError) throw signedError;

//       return {
//         ...doc,
//         file_url: signed.signedUrl, // this is what frontend should open
//       };
//     })
//   );

//   return docsWithUrls;
// }

// export async function semanticSearch({ query, topK = 5, documentId = null }) {
//   const [emb] = await embedTexts([query]);
//   const { data, error } = await supabase.rpc("match_chunks", {
//     query_embedding: emb,
//     match_count: topK,
//     p_document_id: documentId ?? null,
//   });
//   if (error) throw error;
//   return data;
// }

import supabase from "./supabase.js";
import { extractText, chunkText } from "./text.js";
import fs from "fs/promises";
import { OpenAI } from "openai";
import path from "path";
import pinecone from "./pinecone.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Store raw file in Supabase Storage
 */
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

/**
 * Insert metadata record in Supabase "documents" table
 */
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

/**
 * Create embeddings using OpenAI
 */
export async function embedTexts(texts) {
  const model = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
  const res = await openai.embeddings.create({
    model,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

/**
 * Upload, extract text, chunk, embed, and index into Supabase + Pinecone
 */
export async function processAndIndex({
  tmpPath,
  fileName,
  mime,
  sizeBytes,
  userId,
}) {
  // 1) store raw file in Supabase storage
  const storage_path = await storeFileToSupabase(tmpPath, fileName, mime);

  // 2) create document row in Supabase
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

  // 4) insert chunks with embeddings into Supabase
  const rows = chunks.map((content, i) => ({
    document_id: doc.id,
    chunk_index: i,
    content,
    embedding: vectors[i], // Supabase stores as pgvector
  }));

  const { error } = await supabase.from("doc_chunks").insert(rows);
  if (error) throw error;

  // 5) insert chunks with embeddings into Pinecone
  const index = pinecone.index(process.env.PINECONE_INDEX);
  await index.upsert(
    rows.map((row, i) => ({
      id: `${doc.id}-${i}`,
      values: vectors[i],
      metadata: {
        document_id: doc.id,
        chunk_index: i,
        content: row.content,
      },
    }))
  );

  return doc;
}

/**
 * Get history of uploaded documents (with signed URL for download)
 */
export async function listHistory({ userId }) {
  const q = supabase
    .from("documents")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (userId) q.eq("user_id", userId);

  const { data, error } = await q;
  if (error) throw error;

  const docsWithUrls = await Promise.all(
    data.map(async (doc) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .createSignedUrl(doc.storage_path, 60 * 60); // 1 hour
      if (signedError) throw signedError;

      return {
        ...doc,
        file_url: signed.signedUrl,
      };
    })
  );

  return docsWithUrls;
}

/**
 * Semantic search using Supabase pgvector + match_chunks function
 */
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

/**
 * Semantic search using Pinecone
 */
export async function semanticSearchPinecone({ query, topK = 5 }) {
  const [emb] = await embedTexts([query]);

  const index = pinecone.index(process.env.PINECONE_INDEX);
  const results = await index.query({
    vector: emb,
    topK,
    includeMetadata: true,
  });

  return results.matches.map((m) => ({
    id: m.id,
    score: m.score,
    ...m.metadata,
  }));
}

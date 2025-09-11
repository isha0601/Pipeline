import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testPinecone() {
  try {
    console.log("🔍 Testing Pinecone similarity search...");

    // 1) Generate a test embedding
    const query = "what is the main theme of the union Budget 2023-24?"; // Change if you want to test something else
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const embedding = embeddingRes.data[0].embedding;

    // 2) Query Pinecone
    const index = pc.Index("docsearch"); // use your index name
    const results = await index.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });

    console.log("✅ Pinecone responded with:", JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("❌ Pinecone test failed:", err.message);
  }
}

testPinecone();

// // import fs from "fs/promises";
// // // import pdfParse from 'pdf-parse';
// // import mammoth from "mammoth";
// // import path from "path";
// // import pdf from "pdf-parse/lib/pdf-parse.js";

// // export async function extractText(filePath, mime) {
// //   const ext = path.extname(filePath).toLowerCase();
// //   if (mime?.includes("pdf") || ext === ".pdf") {
// //     const buffer = await fs.readFile(filePath);
// //     const data = await pdf(buffer);
// //     return data.text || "";
// //   }
// //   if (mime?.includes("word") || ext === ".docx") {
// //     const buffer = await fs.readFile(filePath);
// //     const { value } = await mammoth.extractRawText({ buffer });
// //     return value || "";
// //   }
// //   // Fallback assume text
// //   return (await fs.readFile(filePath, "utf8")).toString();
// // }

// // export function chunkText(text, chunkSize = 1000, overlap = 200) {
// //   const chunks = [];
// //   let i = 0;
// //   while (i < text.length) {
// //     const end = Math.min(i + chunkSize, text.length);
// //     const slice = text.slice(i, end).trim();
// //     if (slice) chunks.push(slice);
// //     i += chunkSize - overlap;
// //   }
// //   return chunks;
// // }

// import fs from "fs/promises";
// import mammoth from "mammoth";
// import path from "path";
// import pdf from "pdf-parse/lib/pdf-parse.js";
// import PDFParser from "pdf2json";

// export async function extractText(filePath, mime) {
//   const ext = path.extname(filePath).toLowerCase();

//   // Handle PDF
//   if (mime?.includes("pdf") || ext === ".pdf") {
//     const buffer = await fs.readFile(filePath);

//     // First try pdf-parse
//     try {
//       const data = await pdf(buffer);
//       if (data.text?.trim()) {
//         return data.text;
//       }
//     } catch (err) {
//       console.error("pdf-parse failed:", err.message);
//     }

//     // Fallback: pdf2json
//     return new Promise((resolve, reject) => {
//       const pdfParser = new PDFParser();
//       pdfParser.on("pdfParser_dataError", (err) => {
//         console.error("pdf2json failed:", err.parserError);
//         resolve(""); // last fallback empty
//       });
//       pdfParser.on("pdfParser_dataReady", (pdfData) => {
//         const text = pdfData.Pages.map((page) =>
//           page.Texts.map((t) => decodeURIComponent(t.R[0].T)).join(" ")
//         ).join("\n");
//         resolve(text);
//       });
//       pdfParser.loadPDF(filePath);
//     });
//   }

//   // Handle Word docs
//   if (mime?.includes("word") || ext === ".docx") {
//     const buffer = await fs.readFile(filePath);
//     const { value } = await mammoth.extractRawText({ buffer });
//     return value || "";
//   }

//   // Fallback assume plain text
//   return (await fs.readFile(filePath, "utf8")).toString();
// }

// export function chunkText(text, chunkSize = 1000, overlap = 200) {
//   const chunks = [];
//   let i = 0;
//   while (i < text.length) {
//     const end = Math.min(i + chunkSize, text.length);
//     const slice = text.slice(i, end).trim();
//     if (slice) chunks.push(slice);
//     i += chunkSize - overlap;
//   }
//   return chunks;
// }

import fs from "fs/promises";
import mammoth from "mammoth";
import path from "path";
import PDFParser from "pdf2json";

export async function extractText(filePath, mime) {
  const ext = path.extname(filePath).toLowerCase();

  if (mime?.includes("pdf") || ext === ".pdf") {
    const buffer = await fs.readFile(filePath);

    return await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on("pdfParser_dataError", (err) => reject(err.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        const text = pdfData.Pages.map((page) =>
          page.Texts.map(
            (t) => decodeURIComponent(t.R[0].T) // extract text
          ).join(" ")
        ).join("\n");
        resolve(text);
      });
      pdfParser.parseBuffer(buffer);
    });
  }

  if (mime?.includes("word") || ext === ".docx") {
    const buffer = await fs.readFile(filePath);
    const { value } = await mammoth.extractRawText({ buffer });
    return value || "";
  }

  // Fallback assume plain text
  return (await fs.readFile(filePath, "utf8")).toString();
}

export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    const slice = text.slice(i, end).trim();
    if (slice) chunks.push(slice);
    i += chunkSize - overlap;
  }
  return chunks;
}

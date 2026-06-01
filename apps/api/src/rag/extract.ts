import { extractText as extractPdfText } from 'unpdf';

/**
 * Extrait le texte brut d'un fichier déposé. PDF via unpdf (pdf.js, pur JS,
 * sans binaire natif) ; texte/markdown décodés en UTF-8.
 */
export async function extractText(bytes: Uint8Array, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const { text } = await extractPdfText(bytes, { mergePages: true });
    return text;
  }
  return new TextDecoder('utf-8').decode(bytes);
}

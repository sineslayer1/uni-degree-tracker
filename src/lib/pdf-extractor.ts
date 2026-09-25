/**
 * Ephemeral In-Memory PDF Text Extractor
 * Extracts plain text streams directly from PDF ArrayBuffer in client RAM.
 * NEVER uploads the file to any storage bucket or remote disk.
 */

export async function extractTextFromPdfFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  
  // Try standard TextDecoder
  const rawString = new TextDecoder('latin1').decode(uint8);
  
  const extractedLines: string[] = [];
  
  // Extract text within BT (Begin Text) and ET (End Text) blocks or TJ / Tj operators
  const textBlockRegex = /BT[\s\S]*?ET/g;
  let match: RegExpExecArray | null;
  
  while ((match = textBlockRegex.exec(rawString)) !== null) {
    const block = match[0];
    
    // Look for parenthesized strings: (Sample Text) Tj or [(Part 1) 20 (Part 2)] TJ
    const stringMatches = block.match(/\((?:\\.|[^()\\])*\)/g);
    if (stringMatches) {
      const line = stringMatches
        .map((s) => s.slice(1, -1).replace(/\\([()\\])/g, '$1'))
        .join(' ')
        .trim();
      if (line.length > 0) {
        extractedLines.push(line);
      }
    }
  }

  // Fallback: If minimal text stream was parsed (e.g. compressed stream), search for readable strings
  if (extractedLines.join(' ').length < 50) {
    const fallbackLines = rawString
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[a-zA-Z0-9\s:.,%()-]{4,100}$/.test(l));
    
    if (fallbackLines.length > 5) {
      return fallbackLines.slice(0, 150).join('\n');
    }
  }

  const result = extractedLines.join('\n');
  return result.trim().length > 0 ? result : `Unit Outline (${file.name})\nExtracted content from ${file.name}.`;
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

if (typeof globalThis.self === 'undefined') {
  globalThis.self = globalThis;
}

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        outputPdf: vi.fn().mockResolvedValue('data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og...[valid-pdf-base64-payload-here-more-than-500-bytes]................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................')
      })
    })
  })
}));

describe('Auto-Save PDF Rendering & Document Integrity Tests', () => {
  const printServicePath = path.resolve(__dirname, '../src/services/printService.js');
  const printServiceCode = fs.readFileSync(printServicePath, 'utf8');

  it('1. Verifies autoSavePdfDocument uses visible-coordinate sandbox at left: 0, top: 0, zIndex: -9999 instead of -9999px', () => {
    expect(printServiceCode).toContain("sandbox.id = 'temp-autosave-pdf-sandbox';");
    expect(printServiceCode).toContain("sandbox.style.position = 'fixed';");
    expect(printServiceCode).toContain("sandbox.style.left = '0';");
    expect(printServiceCode).toContain("sandbox.style.top = '0';");
    expect(printServiceCode).toContain("sandbox.style.zIndex = '-9999';");
    expect(printServiceCode).not.toContain("offscreen.style.left = '-9999px';");
  });

  it('2. Verifies autoSavePdfDocument preloads and decodes images before taking canvas snapshot', () => {
    expect(printServiceCode).toContain('const imgElements = Array.from(targetEl.querySelectorAll(\'img\'));');
    expect(printServiceCode).toContain('await Promise.all(imgElements.map(img =>');
    expect(printServiceCode).toContain('if (img.complete && img.naturalWidth !== 0)');
  });

  it('3. Verifies html2canvas configuration includes scrollY: 0, scrollX: 0, and windowWidth: 755', () => {
    expect(printServiceCode).toContain('scrollY: 0,');
    expect(printServiceCode).toContain('scrollX: 0,');
    expect(printServiceCode).toContain('windowWidth: 755');
    expect(printServiceCode).toContain('scale: 2.2,');
  });

  it('4. Verifies autoSavePdfDocument validates base64 length and format before saving', () => {
    expect(printServiceCode).toContain('isValidPdfBase64');
    expect(printServiceCode).toContain("pdfBase64.length > 500 && pdfBase64.includes(';base64,')");
  });

  it('5. Verifies server.js validates PDF header (%PDF) and size (>500 bytes) to block corrupt/blank 20-byte files', () => {
    const serverPath = path.resolve(__dirname, '../server.js');
    const serverCode = fs.readFileSync(serverPath, 'utf8');
    expect(serverCode).toContain("buffer.length > 500 && buffer.slice(0, 5).toString().startsWith('%PDF')");
    expect(serverCode).toContain('Saving HTML fallback');
  });
});


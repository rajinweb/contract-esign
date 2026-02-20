/**
 * Centralized PDF.js worker configuration
 * This module ensures PDF.js worker is initialized only once globally
 * to avoid redundant configurations across components
 */

let isInitialized = false;

interface PdfjsLike {
  version: string;
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

export function initializePdfWorker(pdfjs: PdfjsLike): void {
  if (isInitialized) return;
  
  try {
    // Prefer the locally bundled worker to avoid runtime CDN fetch issues.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    isInitialized = true;
  } catch (error) {
    // Fallback for bundlers/environments that cannot resolve import.meta.url.
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    isInitialized = true;
    console.warn('Falling back to CDN PDF worker source:', error);
  }
}

export function isPdfWorkerInitialized(): boolean {
  return isInitialized;
}

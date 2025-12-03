/**
 * Centralized PDF.js worker configuration
 * This module ensures PDF.js worker is initialized only once globally
 * to avoid redundant configurations across components
 */

let isInitialized = false;

export function initializePdfWorker(pdfjs: any): void {
  if (isInitialized) return;
  
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize PDF worker:', error);
  }
}

export function isPdfWorkerInitialized(): boolean {
  return isInitialized;
}

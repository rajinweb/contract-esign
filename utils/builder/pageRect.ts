export const serializePageRect = (pageRect: any, canvasRect?: DOMRect | null, zoom?: number) => {
  if (!pageRect || typeof pageRect !== 'object') return undefined;
  const rect = pageRect as Record<string, any>;
  const offsetX = canvasRect ? canvasRect.left : 0;
  const offsetY = canvasRect ? canvasRect.top : 0;
  const scale = typeof zoom === 'number' && zoom > 0 ? zoom : 1;
  const cleaned = {
    x: typeof rect.x === 'number' ? (rect.x - offsetX) / scale : undefined,
    y: typeof rect.y === 'number' ? (rect.y - offsetY) / scale : undefined,
    width: typeof rect.width === 'number' ? rect.width / scale : undefined,
    height: typeof rect.height === 'number' ? rect.height / scale : undefined,
    top: typeof rect.top === 'number' ? (rect.top - offsetY) / scale : undefined,
    right: typeof rect.right === 'number' ? (rect.right - offsetX) / scale : undefined,
    bottom: typeof rect.bottom === 'number' ? (rect.bottom - offsetY) / scale : undefined,
    left: typeof rect.left === 'number' ? (rect.left - offsetX) / scale : undefined,
  };
  const hasAny = Object.values(cleaned).some((value) => typeof value === 'number');
  return hasAny ? cleaned : undefined;
};

import { EXPORT_TYPES } from '@regionify/shared';
import type { LegendItem } from '@/store/legendData/types';
import type { LegendLabelsConfig, LegendTitleConfig } from '@/store/legendStyles/types';

export const MAP_SVG_SELECTOR = '.map-svg-container svg';
export const MAP_EXPORT_ROOT = '[data-map-export-root]';
export const MAP_EXPORT_FLOATING_LEGEND = '[data-map-export-floating-legend]';
export const MAP_EXPORT_BOTTOM_LEGEND = '[data-map-export-bottom-legend]';
export const MAP_EXPORT_TIME_PERIOD_LABEL = '[data-map-export-time-period-label]';
const LEGEND_NO_DATA_SWATCH_BORDER = '#d1d5db';
const DEFAULT_EXPORT_NAME = 'regionify-map';
const DEFAULT_WATERMARK_LOGO_SRC = '/favicon-32x32.png';

export type MapExportLegendDrawOptions = {
  title: LegendTitleConfig;
  labels: LegendLabelsConfig;
  items: LegendItem[];
  noDataColor: string;
  /** When true, legend panel has no fill (stroke only), matching on-screen transparent legend. */
  transparentBackground?: boolean;
  backgroundColor: string;
};

export type MapExportWatermarkOptions = {
  text: string;
  showTrademark?: boolean;
  /** Omit or undefined: use default favicon. `null`: text only. */
  logoSrc?: string | null;
};

export type StillExportOpts = {
  backgroundColor?: string;
  watermark?: string | MapExportWatermarkOptions;
  /** Draw legend in export to match on-screen layout when legend markers exist. */
  legendDraw?: MapExportLegendDrawOptions | null;
};

const getMapSvgElement = (): SVGSVGElement => {
  const el = document.querySelector<SVGSVGElement>(MAP_SVG_SELECTOR);
  if (!el) throw new Error('Map SVG element not found');
  return el;
};

/**
 * Clones the SVG and prepares it for standalone export
 * by setting namespaces and explicit dimensions from the viewBox
 * or optional CSS-pixel width/height (for raster matching on-screen size).
 */
const prepareSvgForExport = (
  svgElement: SVGSVGElement,
  exportCssWidth?: number,
  exportCssHeight?: number,
): SVGSVGElement => {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const useExplicitSize =
    exportCssWidth != null &&
    exportCssHeight != null &&
    Number.isFinite(exportCssWidth) &&
    Number.isFinite(exportCssHeight) &&
    exportCssWidth > 0 &&
    exportCssHeight > 0;

  if (useExplicitSize) {
    clone.setAttribute('width', String(Math.round(exportCssWidth)));
    clone.setAttribute('height', String(Math.round(exportCssHeight)));
  } else {
    const viewBox = clone.getAttribute('viewBox');
    if (viewBox) {
      const [, , width, height] = viewBox.split(/\s+/).map(Number);
      clone.setAttribute('width', String(width));
      clone.setAttribute('height', String(height));
    }
  }

  return clone;
};

export const triggerDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Defer revoke so the browser can finish reading the blob. Immediate revoke races with
  // Playwright's download watcher (and some download managers), producing a 0-byte file.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** SVG legend overlay; geometry matches {@link drawLegendOnCanvas} at the given scale. */
const buildLegendSvgFragment = (
  x: number,
  y: number,
  w: number,
  h: number,
  legend: MapExportLegendDrawOptions,
  scale: number,
): string => {
  const clipId = `lg${Math.random().toString(36).slice(2, 11)}`;
  const pad = Math.round(8 * scale);
  const radius = Math.min(Math.round(8 * scale), w / 2, h / 2);
  const swatch = Math.round(12 * scale);
  const fontSize = Math.round(legend.labels.fontSize * scale);
  const swatchTextGap = Math.round(8 * scale);
  const rowGap = Math.round(8 * scale);
  const titleGap = Math.round(12 * scale);
  const font = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

  const parts: string[] = [];
  parts.push(
    `<defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}"/></clipPath></defs>`,
  );
  parts.push(`<g clip-path="url(#${clipId})">`);
  const fill = legend.transparentBackground === true ? 'none' : escapeXml(legend.backgroundColor);
  parts.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="rgba(24, 41, 77, 0.2)" stroke-width="1"/>`,
  );

  let cy = y + pad + Math.round(2 * scale);
  if (legend.title.show && legend.title.text.trim()) {
    parts.push(
      `<text x="${x + pad}" y="${cy}" font-size="${fontSize}" font-weight="600" fill="${legend.labels.color}" font-family="${font}" dominant-baseline="hanging">${escapeXml(legend.title.text)}</text>`,
    );
    cy += fontSize + titleGap;
  }

  for (const item of legend.items) {
    const rowCenter = cy;
    parts.push(
      `<rect x="${x + pad}" y="${rowCenter - swatch / 2}" width="${swatch}" height="${swatch}" fill="${item.color}"/>`,
    );
    parts.push(
      `<text x="${x + pad + swatch + swatchTextGap}" y="${rowCenter}" font-size="${fontSize}" fill="${legend.labels.color}" font-family="${font}" dominant-baseline="middle">${escapeXml(item.name)}</text>`,
    );
    cy += Math.max(swatch, fontSize) + rowGap;
  }

  const ndY = cy;
  parts.push(
    `<rect x="${x + pad}" y="${ndY - swatch / 2}" width="${swatch}" height="${swatch}" fill="${legend.noDataColor}" stroke="${LEGEND_NO_DATA_SWATCH_BORDER}" stroke-width="1"/>`,
  );
  parts.push(
    `<text x="${x + pad + swatch + swatchTextGap}" y="${ndY}" font-size="${fontSize}" fill="${legend.labels.color}" font-family="${font}" dominant-baseline="middle">No Data</text>`,
  );

  parts.push('</g>');
  return parts.join('');
};

const buildWatermarkSvgFragment = async (
  width: number,
  height: number,
  watermark: string | MapExportWatermarkOptions,
): Promise<string> => {
  const { text, showTrademark, logoSrc } = normalizeWatermark(watermark);
  const line = showTrademark ? `${text}\u2122` : text;

  const pad = Math.max(10, Math.round(Math.min(width, height) * 0.014));
  const fontSize = Math.max(13, Math.round(Math.min(width, height) * 0.024));
  const logoGap = Math.round(fontSize * 0.4);

  const parts: string[] = ['<g opacity="0.76">'];

  let textWidth = line.length * fontSize * 0.55;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.font = `400 ${fontSize}px Montserrat, Arial, sans-serif`;
      textWidth = ctx.measureText(line).width;
    }
  }

  let logoDrawSize = 0;
  let dataHref = '';
  if (logoSrc) {
    const logo = await loadRasterForCanvas(logoSrc);
    if (logo) {
      logoDrawSize = Math.round(fontSize * 1.35);
      const lc = document.createElement('canvas');
      lc.width = logoDrawSize;
      lc.height = logoDrawSize;
      const lctx = lc.getContext('2d');
      if (lctx) {
        lctx.drawImage(logo, 0, 0, logoDrawSize, logoDrawSize);
        try {
          dataHref = lc.toDataURL('image/png');
        } catch {
          dataHref = '';
        }
      }
    }
  }

  const textX = width - pad;
  const baselineY = height - pad;

  if (dataHref && logoDrawSize > 0) {
    const logoX = textX - textWidth - logoGap - logoDrawSize;
    const logoY = baselineY - logoDrawSize;
    const safeHref = dataHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    parts.push(
      `<image href="${safeHref}" x="${logoX}" y="${logoY}" width="${logoDrawSize}" height="${logoDrawSize}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  parts.push(
    `<text x="${textX}" y="${baselineY}" text-anchor="end" dominant-baseline="alphabetic" font-size="${fontSize}" font-weight="400" fill="rgb(180, 180, 180)" font-family="Montserrat, Arial, sans-serif">${escapeXml(line)}</text>`,
  );
  parts.push('</g>');
  return parts.join('');
};

/**
 * Builds a standalone SVG matching the composite raster export (map + frame + legend + watermark).
 */
const tryBuildCompositeSvgDocument = async (opts?: StillExportOpts): Promise<string | null> => {
  const root = document.querySelector<HTMLElement>(MAP_EXPORT_ROOT);
  if (!root) return null;

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  const svgEl = root.querySelector<SVGSVGElement>(MAP_SVG_SELECTOR);
  if (!svgEl) return null;

  const qs = 1;
  const rootRect = root.getBoundingClientRect();
  const W = Math.max(1, Math.round(rootRect.width));
  const H = Math.max(1, Math.round(rootRect.height));

  const chunks: string[] = [];
  chunks.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  );

  if (opts?.backgroundColor) {
    chunks.push(`<rect width="${W}" height="${H}" fill="${opts.backgroundColor}"/>`);
  }

  const svgRect = svgEl.getBoundingClientRect();
  const sx = svgRect.left - rootRect.left;
  const sy = svgRect.top - rootRect.top;
  const sw = Math.max(1, Math.round(svgRect.width));
  const sh = Math.max(1, Math.round(svgRect.height));

  const clone = prepareSvgForExport(svgEl, sw, sh);
  const innerSvg = new XMLSerializer().serializeToString(clone);
  chunks.push(`<g transform="translate(${sx.toFixed(2)},${sy.toFixed(2)})">`);
  chunks.push(innerSvg);
  chunks.push('</g>');

  const legendEl =
    root.querySelector<HTMLElement>(MAP_EXPORT_FLOATING_LEGEND) ??
    root.querySelector<HTMLElement>(MAP_EXPORT_BOTTOM_LEGEND);
  if (legendEl && opts?.legendDraw && opts.legendDraw.items.length > 0) {
    const lr = legendEl.getBoundingClientRect();
    const lx = lr.left - rootRect.left;
    const ly = lr.top - rootRect.top;
    const lw = Math.max(1, lr.width);
    const lh = Math.max(1, lr.height);
    chunks.push(buildLegendSvgFragment(lx, ly, lw, lh, opts.legendDraw, qs));
  }

  if (opts?.watermark) {
    chunks.push(await buildWatermarkSvgFragment(W, H, opts.watermark));
  }

  chunks.push('</svg>');
  return chunks.join('');
};

const loadRasterForCanvas = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const normalizeWatermark = (
  watermark: string | MapExportWatermarkOptions,
): { text: string; showTrademark: boolean; logoSrc: string | null } => {
  if (typeof watermark === 'string') {
    return {
      text: watermark,
      showTrademark: false,
      logoSrc: DEFAULT_WATERMARK_LOGO_SRC,
    };
  }
  return {
    text: watermark.text,
    showTrademark: watermark.showTrademark ?? false,
    logoSrc: watermark.logoSrc === undefined ? DEFAULT_WATERMARK_LOGO_SRC : watermark.logoSrc,
  };
};

/**
 * Light gray corner watermark: optional logo, brand text, optional ™.
 */
export const drawWatermark = async (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  watermark: string | MapExportWatermarkOptions,
): Promise<void> => {
  const { text, showTrademark, logoSrc } = normalizeWatermark(watermark);
  const line = showTrademark ? `${text}\u2122` : text;

  const pad = Math.max(10, Math.round(Math.min(width, height) * 0.014));
  const fontSize = Math.max(13, Math.round(Math.min(width, height) * 0.024));

  let logo: HTMLImageElement | null = null;
  if (logoSrc) {
    logo = await loadRasterForCanvas(logoSrc);
  }

  ctx.save();
  ctx.globalAlpha = 0.76;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = `400 ${fontSize}px Montserrat, Arial, sans-serif`;
  ctx.fillStyle = 'rgb(180, 180, 180)';

  const textWidth = ctx.measureText(line).width;
  const logoGap = Math.round(fontSize * 0.4);
  const logoDrawSize = logo ? Math.round(fontSize * 1.35) : 0;

  const textX = width - pad;
  const baselineY = height - pad;

  if (logo && logoDrawSize > 0) {
    const logoX = textX - textWidth - logoGap - logoDrawSize;
    const logoY = baselineY - logoDrawSize;
    ctx.drawImage(logo, logoX, logoY, logoDrawSize, logoDrawSize);
  }

  ctx.fillText(line, textX, baselineY);
  ctx.restore();
};

/**
 * Renders a serialized SVG string onto a canvas at the given scale.
 */
const svgToCanvas = (svgString: string, scale: number): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render SVG to image'));
    };

    img.src = url;
  });
};

export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Failed to generate ${mimeType} blob`));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
};

/**
 * Quality (1–100) maps to a canvas scale multiplier.
 * 25 → 1×, 50 → 2×, 100 → 4×. Minimum is clamped to 0.5×.
 */
const qualityToScale = (quality: number): number => Math.max(0.5, quality / 25);

const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
};

export const drawLegendOnCanvas = (
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; w: number; h: number },
  legend: MapExportLegendDrawOptions,
  scale: number,
): void => {
  const { x, y, w, h } = bounds;
  const pad = Math.round(8 * scale);
  const radius = Math.round(8 * scale);
  const swatch = Math.round(12 * scale);
  const fontSize = Math.round(legend.labels.fontSize * scale);
  const swatchTextGap = Math.round(8 * scale);
  const rowGap = Math.round(8 * scale);
  const titleGap = Math.round(12 * scale);

  ctx.save();
  ctx.beginPath();
  drawRoundedRectPath(ctx, x, y, w, h, radius);
  ctx.clip();

  ctx.beginPath();
  drawRoundedRectPath(ctx, x, y, w, h, radius);
  if (!legend.transparentBackground) {
    ctx.fillStyle = legend.backgroundColor;
    ctx.fill();
  }
  ctx.beginPath();
  drawRoundedRectPath(ctx, x, y, w, h, radius);
  ctx.strokeStyle = 'rgba(24, 41, 77, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  let cy = y + pad + Math.round(2 * scale);
  ctx.textAlign = 'left';

  if (legend.title.show && legend.title.text.trim()) {
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = legend.labels.color;
    ctx.textBaseline = 'top';
    ctx.fillText(legend.title.text, x + pad, cy);
    cy += fontSize + titleGap;
  }

  ctx.textBaseline = 'middle';

  for (const item of legend.items) {
    ctx.fillStyle = item.color;
    ctx.fillRect(x + pad, cy - swatch / 2, swatch, swatch);
    ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = legend.labels.color;
    ctx.fillText(item.name, x + pad + swatch + swatchTextGap, cy);
    cy += Math.max(swatch, fontSize) + rowGap;
  }

  ctx.strokeStyle = LEGEND_NO_DATA_SWATCH_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + pad, cy - swatch / 2, swatch, swatch);
  ctx.fillStyle = legend.noDataColor;
  ctx.fillRect(x + pad + 0.5, cy - swatch / 2 + 0.5, swatch - 1, swatch - 1);
  ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = legend.labels.color;
  ctx.fillText('No Data', x + pad + swatch + swatchTextGap, cy);

  ctx.restore();
};

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Crops a canvas to the given rectangle. Returns a new canvas with the cropped area. */
export const cropCanvas = (source: HTMLCanvasElement, crop: CropRect): HTMLCanvasElement => {
  const cropped = document.createElement('canvas');
  cropped.width = Math.round(crop.width);
  cropped.height = Math.round(crop.height);
  const ctx = cropped.getContext('2d');
  if (!ctx) throw new Error('Failed to get crop canvas context');
  ctx.drawImage(
    source,
    Math.round(crop.x),
    Math.round(crop.y),
    Math.round(crop.width),
    Math.round(crop.height),
    0,
    0,
    Math.round(crop.width),
    Math.round(crop.height),
  );
  return cropped;
};

/**
 * Generates the map canvas at export quality using the composite DOM layout.
 * Returns the canvas if successful, or null if the export root is unavailable.
 */
export const generateMapCanvas = async (
  quality: number,
  format: 'png' | 'jpeg',
  opts?: StillExportOpts,
  targetHeight?: number,
): Promise<HTMLCanvasElement | null> => {
  const root = document.querySelector<HTMLElement>(MAP_EXPORT_ROOT);
  if (!root) return null;

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  const svgEl = root.querySelector<SVGSVGElement>(MAP_SVG_SELECTOR);
  if (!svgEl) return null;

  const rootRect = root.getBoundingClientRect();
  const qs = targetHeight != null ? targetHeight / rootRect.height : qualityToScale(quality);
  const w = Math.max(1, Math.round(rootRect.width * qs));
  const h = Math.max(1, targetHeight ?? Math.round(rootRect.height * qs));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  if (format === 'jpeg') {
    ctx.fillStyle = opts?.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, w, h);
  } else if (opts?.backgroundColor) {
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, w, h);
  }

  const svgRect = svgEl.getBoundingClientRect();
  const sw = Math.max(1, Math.round(svgRect.width * qs));
  const sh = Math.max(1, Math.round(svgRect.height * qs));
  const sx = (svgRect.left - rootRect.left) * qs;
  const sy = (svgRect.top - rootRect.top) * qs;

  const clone = prepareSvgForExport(svgEl, sw, sh);
  const svgString = new XMLSerializer().serializeToString(clone);
  const mapCanvas = await svgToCanvas(svgString, 1);
  ctx.drawImage(mapCanvas, Math.round(sx), Math.round(sy));

  const legendEl =
    root.querySelector<HTMLElement>(MAP_EXPORT_FLOATING_LEGEND) ??
    root.querySelector<HTMLElement>(MAP_EXPORT_BOTTOM_LEGEND);
  if (legendEl && opts?.legendDraw && opts.legendDraw.items.length > 0) {
    const lr = legendEl.getBoundingClientRect();
    const lx = (lr.left - rootRect.left) * qs;
    const ly = (lr.top - rootRect.top) * qs;
    const lw = Math.max(1, lr.width * qs);
    const lh = Math.max(1, lr.height * qs);
    drawLegendOnCanvas(ctx, { x: lx, y: ly, w: lw, h: lh }, opts.legendDraw, qs);
  }

  if (opts?.watermark) {
    await drawWatermark(ctx, w, h, opts.watermark);
  }

  return canvas;
};

/**
 * Fallback canvas generation when the composite DOM root is not available.
 * Renders from the SVG element directly (no legend/layout matching).
 */
export const generateMapCanvasFallback = async (
  quality: number,
  format: 'png' | 'jpeg',
  opts?: StillExportOpts,
  targetHeight?: number,
): Promise<HTMLCanvasElement> => {
  const svgEl = getMapSvgElement();
  const svgRect = svgEl.getBoundingClientRect();
  const scale =
    targetHeight != null && svgRect.height > 0
      ? targetHeight / svgRect.height
      : qualityToScale(quality);
  const exportWidth = Math.max(1, Math.round(svgRect.width * scale));
  const exportHeight = Math.max(1, targetHeight ?? Math.round(svgRect.height * scale));
  const clone = prepareSvgForExport(svgEl, exportWidth, exportHeight);
  const svgString = new XMLSerializer().serializeToString(clone);
  const canvas = await svgToCanvas(svgString, 1);
  const ctx = canvas.getContext('2d');

  if (format === 'jpeg') {
    const jpegCanvas = document.createElement('canvas');
    jpegCanvas.width = canvas.width;
    jpegCanvas.height = canvas.height;
    const jpegCtx = jpegCanvas.getContext('2d');
    if (!jpegCtx) throw new Error('Failed to create JPEG canvas context');
    jpegCtx.fillStyle = opts?.backgroundColor || '#ffffff';
    jpegCtx.fillRect(0, 0, jpegCanvas.width, jpegCanvas.height);
    jpegCtx.drawImage(canvas, 0, 0);
    if (opts?.watermark) {
      await drawWatermark(jpegCtx, jpegCanvas.width, jpegCanvas.height, opts.watermark);
    }
    return jpegCanvas;
  }

  if (ctx && opts?.backgroundColor) {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (ctx && opts?.watermark) {
    await drawWatermark(ctx, canvas.width, canvas.height, opts.watermark);
  }
  return canvas;
};

/**
 * Exports map + optional legend using the same layout as the visualizer (zoom/pan/legend position).
 * @returns true if composite export ran, false if markers were missing (caller may fall back).
 */
const tryExportCompositeStill = async (
  quality: number,
  fileName: string,
  format: 'png' | 'jpeg',
  opts?: StillExportOpts,
): Promise<boolean> => {
  const canvas = await generateMapCanvas(quality, format, opts);
  if (!canvas) return false;

  if (format === 'png') {
    const blob = await canvasToBlob(canvas, `image/${EXPORT_TYPES.png}`);
    triggerDownload(blob, `${fileName}.${EXPORT_TYPES.png}`);
  } else {
    const blob = await canvasToBlob(canvas, `image/${EXPORT_TYPES.jpeg}`, 0.92);
    triggerDownload(blob, `${fileName}.${EXPORT_TYPES.jpeg}`);
  }

  return true;
};

export const exportMapAsSvg = async (
  fileName = DEFAULT_EXPORT_NAME,
  opts?: StillExportOpts,
): Promise<void> => {
  const composite = await tryBuildCompositeSvgDocument(opts);
  if (composite) {
    const blob = new Blob([composite], { type: `image/${EXPORT_TYPES.svg}+xml;charset=utf-8` });
    triggerDownload(blob, `${fileName}.${EXPORT_TYPES.svg}`);
    return;
  }

  const clone = prepareSvgForExport(getMapSvgElement());
  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: `image/${EXPORT_TYPES.svg}+xml;charset=utf-8` });
  triggerDownload(blob, `${fileName}.${EXPORT_TYPES.svg}`);
};

export const exportMapAsPng = async (
  quality: number,
  fileName = DEFAULT_EXPORT_NAME,
  opts?: StillExportOpts,
): Promise<void> => {
  if (await tryExportCompositeStill(quality, fileName, 'png', opts)) {
    return;
  }

  const pngSvgEl = getMapSvgElement();
  const pngSvgRect = pngSvgEl.getBoundingClientRect();
  const pngScale = qualityToScale(quality);
  const pngClone = prepareSvgForExport(
    pngSvgEl,
    Math.max(1, Math.round(pngSvgRect.width * pngScale)),
    Math.max(1, Math.round(pngSvgRect.height * pngScale)),
  );
  const canvas = await svgToCanvas(new XMLSerializer().serializeToString(pngClone), 1);
  const ctx = canvas.getContext('2d');
  if (ctx && opts?.backgroundColor) {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (ctx && opts?.watermark) {
    await drawWatermark(ctx, canvas.width, canvas.height, opts.watermark);
  }
  const blob = await canvasToBlob(canvas, `image/${EXPORT_TYPES.png}`);
  triggerDownload(blob, `${fileName}.${EXPORT_TYPES.png}`);
};

export const exportMapAsJpeg = async (
  quality: number,
  fileName = DEFAULT_EXPORT_NAME,
  opts?: StillExportOpts,
): Promise<void> => {
  if (await tryExportCompositeStill(quality, fileName, 'jpeg', opts)) {
    return;
  }

  const jpegSvgEl = getMapSvgElement();
  const jpegSvgRect = jpegSvgEl.getBoundingClientRect();
  const jpegScale = qualityToScale(quality);
  const jpegClone = prepareSvgForExport(
    jpegSvgEl,
    Math.max(1, Math.round(jpegSvgRect.width * jpegScale)),
    Math.max(1, Math.round(jpegSvgRect.height * jpegScale)),
  );
  const canvas = await svgToCanvas(new XMLSerializer().serializeToString(jpegClone), 1);

  const jpegCanvas = document.createElement('canvas');
  jpegCanvas.width = canvas.width;
  jpegCanvas.height = canvas.height;

  const ctx = jpegCanvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create JPEG canvas context');

  ctx.fillStyle = opts?.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, jpegCanvas.width, jpegCanvas.height);
  ctx.drawImage(canvas, 0, 0);
  if (opts?.watermark) {
    await drawWatermark(ctx, jpegCanvas.width, jpegCanvas.height, opts.watermark);
  }
  const blob = await canvasToBlob(jpegCanvas, `image/${EXPORT_TYPES.jpeg}`, 0.92);
  triggerDownload(blob, `${fileName}.${EXPORT_TYPES.jpeg}`);
};

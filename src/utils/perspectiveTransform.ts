import { Point2D, TileQuadCorners } from '../types';

/**
 * Calculates the 3x3 Projective Transformation (Homography) matrix
 * mapping from Destination rectangle [0,0, W, H] back to Source Quad (srcPoints).
 */
export function getProjectiveTransform(
  src: [Point2D, Point2D, Point2D, Point2D], // [TL, TR, BR, BL]
  dstWidth: number,
  dstHeight: number
): number[] {
  const x0 = src[0].x, y0 = src[0].y;
  const x1 = src[1].x, y1 = src[1].y;
  const x2 = src[2].x, y2 = src[2].y;
  const x3 = src[3].x, y3 = src[3].y;

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;

  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;

  let g = 0;
  let h = 0;

  if (Math.abs(sx) < 1e-7 && Math.abs(sy) < 1e-7) {
    const a = (x1 - x0) / dstWidth;
    const b = (x3 - x0) / dstHeight;
    const c = x0;
    const d = (y1 - y0) / dstWidth;
    const e = (y3 - y0) / dstHeight;
    const f = y0;
    return [a, b, c, d, e, f, 0, 0, 1];
  } else {
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) < 1e-7) {
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }
    g = (sx * dy2 - sy * dx2) / (det * dstWidth);
    h = (dx1 * sy - dy1 * sx) / (det * dstHeight);

    const a = (x1 - x0) / dstWidth + g * x1;
    const b = (x3 - x0) / dstHeight + h * x3;
    const c = x0;
    const d = (y1 - y0) / dstWidth + g * y1;
    const e = (y3 - y0) / dstHeight + h * y3;
    const f = y0;

    return [a, b, c, d, e, f, g, h, 1];
  }
}

/**
 * Applies full 4-point Perspective Transform & background isolation on Canvas.
 * Outputs a rectified, flat, square or rectangular tile image (Data URL).
 */
export async function applyPerspectiveCorrection(
  imgSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  corners: TileQuadCorners,
  outWidth = 512,
  outHeight = 512
): Promise<string> {
  const srcW = 'videoWidth' in imgSource ? imgSource.videoWidth : imgSource.width;
  const srcH = 'videoHeight' in imgSource ? imgSource.videoHeight : imgSource.height;

  if (!srcW || !srcH) {
    throw new Error('Invalid image source dimensions');
  }

  // Create temporary source canvas
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) throw new Error('Could not get source canvas 2d context');

  srcCtx.drawImage(imgSource, 0, 0, srcW, srcH);
  const srcImageData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcData = srcImageData.data;

  // Destination canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = outWidth;
  dstCanvas.height = outHeight;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) throw new Error('Could not get destination canvas context');

  const dstImageData = dstCtx.createImageData(outWidth, outHeight);
  const dstData = dstImageData.data;

  // Convert normalized corner coordinates to source pixel coordinates
  const pTL: Point2D = { x: Math.max(0, Math.min(srcW, corners.topLeft.x * srcW)), y: Math.max(0, Math.min(srcH, corners.topLeft.y * srcH)) };
  const pTR: Point2D = { x: Math.max(0, Math.min(srcW, corners.topRight.x * srcW)), y: Math.max(0, Math.min(srcH, corners.topRight.y * srcH)) };
  const pBR: Point2D = { x: Math.max(0, Math.min(srcW, corners.bottomRight.x * srcW)), y: Math.max(0, Math.min(srcH, corners.bottomRight.y * srcH)) };
  const pBL: Point2D = { x: Math.max(0, Math.min(srcW, corners.bottomLeft.x * srcW)), y: Math.max(0, Math.min(srcH, corners.bottomLeft.y * srcH)) };

  const matrix = getProjectiveTransform([pTL, pTR, pBR, pBL], outWidth, outHeight);
  const [a, b, c, d, e, f, g, h, i] = matrix;

  // Fast pixel-wise inverse bilinear mapping
  for (let dy = 0; dy < outHeight; dy++) {
    for (let dx = 0; dx < outWidth; dx++) {
      const denom = g * dx + h * dy + i;
      if (Math.abs(denom) < 1e-6) continue;

      const sx = (a * dx + b * dy + c) / denom;
      const sy = (d * dx + e * dy + f) / denom;

      const dstIdx = (dy * outWidth + dx) * 4;

      if (sx >= 0 && sx < srcW - 1 && sy >= 0 && sy < srcH - 1) {
        const xFloor = Math.floor(sx);
        const yFloor = Math.floor(sy);
        const xFrac = sx - xFloor;
        const yFrac = sy - yFloor;

        const idx00 = (yFloor * srcW + xFloor) * 4;
        const idx10 = (yFloor * srcW + (xFloor + 1)) * 4;
        const idx01 = ((yFloor + 1) * srcW + xFloor) * 4;
        const idx11 = ((yFloor + 1) * srcW + (xFloor + 1)) * 4;

        const w00 = (1 - xFrac) * (1 - yFrac);
        const w10 = xFrac * (1 - yFrac);
        const w01 = (1 - xFrac) * yFrac;
        const w11 = xFrac * yFrac;

        dstData[dstIdx] = Math.round(
          srcData[idx00] * w00 + srcData[idx10] * w10 + srcData[idx01] * w01 + srcData[idx11] * w11
        );
        dstData[dstIdx + 1] = Math.round(
          srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11
        );
        dstData[dstIdx + 2] = Math.round(
          srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11
        );
        dstData[dstIdx + 3] = 255;
      } else {
        dstData[dstIdx] = 0;
        dstData[dstIdx + 1] = 0;
        dstData[dstIdx + 2] = 0;
        dstData[dstIdx + 3] = 255;
      }
    }
  }

  dstCtx.putImageData(dstImageData, 0, 0);
  return dstCanvas.toDataURL('image/jpeg', 0.94);
}

/**
 * High Accuracy Ceramic Tile Boundary & Quadrilateral Contour Detector.
 * Robustly separates the tile from backgrounds, catalogs, borders, or room mockups.
 */
export function autoDetectTileCorners(
  canvasOrImg: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement
): TileQuadCorners {
  try {
    const width = 'videoWidth' in canvasOrImg ? canvasOrImg.videoWidth : canvasOrImg.width;
    const height = 'videoHeight' in canvasOrImg ? canvasOrImg.videoHeight : canvasOrImg.height;

    if (!width || !height) {
      return getDefaultCorners();
    }

    // Work on a balanced analysis resolution (~240px wide)
    const scanW = 240;
    const scanH = Math.round((height / width) * 240);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = scanW;
    tempCanvas.height = scanH;
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return getDefaultCorners();

    ctx.drawImage(canvasOrImg, 0, 0, scanW, scanH);
    const imgData = ctx.getImageData(0, 0, scanW, scanH);
    const data = imgData.data;

    // 1. Calculate Grayscale + Color Differences from frame borders
    const gray = new Float32Array(scanW * scanH);
    for (let i = 0; i < scanW * scanH; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // 2. Compute background baseline from image boundary margins
    let borderR = 0, borderG = 0, borderB = 0, borderCount = 0;
    for (let x = 0; x < scanW; x += 4) {
      const topIdx = x * 4;
      const btmIdx = ((scanH - 1) * scanW + x) * 4;
      borderR += data[topIdx] + data[btmIdx];
      borderG += data[topIdx + 1] + data[btmIdx + 1];
      borderB += data[topIdx + 2] + data[btmIdx + 2];
      borderCount += 2;
    }
    for (let y = 0; y < scanH; y += 4) {
      const lftIdx = (y * scanW) * 4;
      const rgtIdx = (y * scanW + scanW - 1) * 4;
      borderR += data[lftIdx] + data[rgtIdx];
      borderG += data[lftIdx + 1] + data[rgtIdx + 1];
      borderB += data[lftIdx + 2] + data[rgtIdx + 2];
      borderCount += 2;
    }
    borderR /= borderCount;
    borderG /= borderCount;
    borderB /= borderCount;

    // 3. Scan horizontal & vertical profiles for strong tile transitions
    // Horizontal scan from top to bottom
    const horizEdges: { left: number; right: number; y: number }[] = [];
    const stepY = Math.max(2, Math.floor(scanH / 20));

    for (let y = stepY; y < scanH - stepY; y += stepY) {
      let bestLeft = 0;
      let maxDeltaLeft = 0;
      for (let x = 3; x < scanW * 0.45; x++) {
        const idx = (y * scanW + x) * 4;
        const colorDiff = Math.abs(data[idx] - borderR) + Math.abs(data[idx + 1] - borderG) + Math.abs(data[idx + 2] - borderB);
        const grad = Math.abs(gray[y * scanW + x + 1] - gray[y * scanW + x - 1]);
        const score = grad * 1.5 + colorDiff;
        if (score > maxDeltaLeft && (grad > 18 || colorDiff > 35)) {
          maxDeltaLeft = score;
          bestLeft = x;
        }
      }

      let bestRight = scanW - 1;
      let maxDeltaRight = 0;
      for (let x = scanW - 4; x > scanW * 0.55; x--) {
        const idx = (y * scanW + x) * 4;
        const colorDiff = Math.abs(data[idx] - borderR) + Math.abs(data[idx + 1] - borderG) + Math.abs(data[idx + 2] - borderB);
        const grad = Math.abs(gray[y * scanW + x + 1] - gray[y * scanW + x - 1]);
        const score = grad * 1.5 + colorDiff;
        if (score > maxDeltaRight && (grad > 18 || colorDiff > 35)) {
          maxDeltaRight = score;
          bestRight = x;
        }
      }

      if (bestLeft > 0 && bestRight < scanW - 1 && bestRight - bestLeft > scanW * 0.3) {
        horizEdges.push({ left: bestLeft, right: bestRight, y });
      }
    }

    // Vertical scan from left to right
    let bestTop = Math.floor(scanH * 0.08);
    let bestBottom = Math.floor(scanH * 0.92);
    const midX = Math.floor(scanW * 0.5);

    let maxGradTop = 0;
    for (let y = 3; y < scanH * 0.45; y++) {
      const idx = (y * scanW + midX) * 4;
      const colorDiff = Math.abs(data[idx] - borderR) + Math.abs(data[idx + 1] - borderG) + Math.abs(data[idx + 2] - borderB);
      const grad = Math.abs(gray[(y + 1) * scanW + midX] - gray[(y - 1) * scanW + midX]);
      const score = grad * 1.5 + colorDiff;
      if (score > maxGradTop && (grad > 18 || colorDiff > 35)) {
        maxGradTop = score;
        bestTop = y;
      }
    }

    let maxGradBtm = 0;
    for (let y = scanH - 4; y > scanH * 0.55; y--) {
      const idx = (y * scanW + midX) * 4;
      const colorDiff = Math.abs(data[idx] - borderR) + Math.abs(data[idx + 1] - borderG) + Math.abs(data[idx + 2] - borderB);
      const grad = Math.abs(gray[(y + 1) * scanW + midX] - gray[(y - 1) * scanW + midX]);
      const score = grad * 1.5 + colorDiff;
      if (score > maxGradBtm && (grad > 18 || colorDiff > 35)) {
        maxGradBtm = score;
        bestBottom = y;
      }
    }

    // Determine normalized quad corners from detected edges
    let normTLX = 0.08;
    let normTRX = 0.92;
    let normBLX = 0.08;
    let normBRX = 0.92;

    if (horizEdges.length >= 3) {
      // Find top quarter left/right
      const topSegment = horizEdges.slice(0, Math.floor(horizEdges.length / 3));
      const btmSegment = horizEdges.slice(Math.floor((horizEdges.length * 2) / 3));

      const avgTopLeft = topSegment.reduce((acc, cur) => acc + cur.left, 0) / topSegment.length;
      const avgTopRight = topSegment.reduce((acc, cur) => acc + cur.right, 0) / topSegment.length;
      const avgBtmLeft = btmSegment.reduce((acc, cur) => acc + cur.left, 0) / btmSegment.length;
      const avgBtmRight = btmSegment.reduce((acc, cur) => acc + cur.right, 0) / btmSegment.length;

      normTLX = Math.max(0.04, Math.min(0.35, avgTopLeft / scanW));
      normTRX = Math.min(0.96, Math.max(0.65, avgTopRight / scanW));
      normBLX = Math.max(0.04, Math.min(0.35, avgBtmLeft / scanW));
      normBRX = Math.min(0.96, Math.max(0.65, avgBtmRight / scanW));
    }

    const normTLY = Math.max(0.04, Math.min(0.35, bestTop / scanH));
    const normTRY = normTLY;
    const normBLY = Math.min(0.96, Math.max(0.65, bestBottom / scanH));
    const normBRY = normBLY;

    return {
      topLeft: { x: normTLX, y: normTLY },
      topRight: { x: normTRX, y: normTRY },
      bottomRight: { x: normBRX, y: normBRY },
      bottomLeft: { x: normBLX, y: normBLY },
    };
  } catch {
    return getDefaultCorners();
  }
}

/**
 * Standard Default / Center Focused Bounds for Tiles
 */
export function getDefaultCorners(preset: 'square' | 'wide' | 'tall' | 'full' = 'square'): TileQuadCorners {
  switch (preset) {
    case 'square':
      return {
        topLeft: { x: 0.12, y: 0.12 },
        topRight: { x: 0.88, y: 0.12 },
        bottomRight: { x: 0.88, y: 0.88 },
        bottomLeft: { x: 0.12, y: 0.88 },
      };
    case 'wide': // e.g. 30x60 cm horizontal
      return {
        topLeft: { x: 0.08, y: 0.22 },
        topRight: { x: 0.92, y: 0.22 },
        bottomRight: { x: 0.92, y: 0.78 },
        bottomLeft: { x: 0.08, y: 0.78 },
      };
    case 'tall': // e.g. 20x90 cm vertical
      return {
        topLeft: { x: 0.22, y: 0.06 },
        topRight: { x: 0.78, y: 0.06 },
        bottomRight: { x: 0.78, y: 0.94 },
        bottomLeft: { x: 0.22, y: 0.94 },
      };
    case 'full':
    default:
      return {
        topLeft: { x: 0.02, y: 0.02 },
        topRight: { x: 0.98, y: 0.02 },
        bottomRight: { x: 0.98, y: 0.98 },
        bottomLeft: { x: 0.02, y: 0.98 },
      };
  }
}

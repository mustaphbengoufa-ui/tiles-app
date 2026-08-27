export interface Point2D {
  x: number; // 0 to 1 normalized coordinate
  y: number;
}

export interface TileQuadCorners {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

export interface CeramicItem {
  id: string; // كود الصنف مثل CRM-01
  name: string; // اسم البلاطة
  imageResOrPath: string; // مسار الصورة مثل tiles/CRM-01.jpg
  embedding: number[]; // متجه الصورة (يملأه الذكاء الاصطناعي تلقائياً عند أول فتح للتطبيق)
}

export type CeramicTile = CeramicItem;

export interface MatchResult {
  tile: CeramicItem;
  similarity: number;
  percentage: number;
  rank: number;
}

export interface InferenceStats {
  preprocessTimeMs: number;
  inferenceTimeMs: number;
  similaritySearchTimeMs: number;
  totalTimeMs: number;
  vectorDimensions: number;
  catalogSize: number;
}

export type ActiveTab = 'simulator' | 'catalog' | 'userguide';

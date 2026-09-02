export type PageSize = 'letter' | 'a4';
export type CardOrientation = 'portrait' | 'landscape';
export type PaperStockType = 'perforated' | 'standard';

export interface CornerOffset {
  x: number;
  y: number;
}

export interface PaperStockSettings {
  version: number;
  stockType: PaperStockType;
  pageSize: PageSize;
  cardWidth: number;
  cardHeight: number;
  orientation: CardOrientation;
  topMargin: number;
  leftMargin: number;
  horizontalGap: number;
  verticalGap: number;
  bleed: number;
  showGuides: boolean;
  columns: number;
  rows: number;
  cornerOffsets: {
    topLeft: CornerOffset;
    topRight: CornerOffset;
    bottomLeft: CornerOffset;
    bottomRight: CornerOffset;
  };
}

export interface PaperLayout extends PaperStockSettings {
  pageWidthInches: number;
  pageHeightInches: number;
  pageWidthPoints: number;
  pageHeightPoints: number;
  pageWidth: number;
  pageHeight: number;
  effectiveCardWidth: number;
  effectiveCardHeight: number;
  columns: number;
  rows: number;
  cardsPerSheet: number;
}

export const DPI = 300;
export const PRINT_ALIGNMENT_OFFSET_PX = -2;
export const PERFORATED_GUIDE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];
export const DEFAULT_PAPER_STOCK: PaperStockSettings = {
  version: 5,
  stockType: 'perforated',
  pageSize: 'letter', cardWidth: 2, cardHeight: 3.5, orientation: 'landscape',
  topMargin: 0.55, leftMargin: 0.75, horizontalGap: 0, verticalGap: 0, bleed: 0.125, showGuides: true,
  columns: 2, rows: 5,
  cornerOffsets: {
    topLeft: { x: 0, y: 0 }, topRight: { x: 0, y: 0 },
    bottomLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 },
  },
};

const PAGE_SIZES = {
  letter: { width: 8.5, height: 11 },
  a4: { width: 210 / 25.4, height: 297 / 25.4 },
} as const;

export const inchesToPixels = (inches: number) => Math.round(inches * DPI);

export const drawImageCover = (
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else if (sourceRatio < targetRatio) {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
};

export const getPerforatedGuideColor = (index: number) => PERFORATED_GUIDE_COLORS[index % PERFORATED_GUIDE_COLORS.length];

export const getPerforatedCornerGuideIndex = (layout: PaperLayout, index: number) => {
  const lastRowStart = (layout.rows - 1) * layout.columns;
  if (index === 0) return 0;
  if (index === layout.columns - 1) return 1;
  if (index === lastRowStart) return 2;
  if (index === lastRowStart + layout.columns - 1) return 3;
  return null;
};

export const drawPerforatedCornerGuide = (
  context: CanvasRenderingContext2D,
  layout: PaperLayout,
  index: number,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const guideIndex = getPerforatedCornerGuideIndex(layout, index);
  if (guideIndex === null) return;

  const length = Math.min(36, Math.max(16, Math.round(Math.min(width, height) * 0.08)));
  const inset = 12;
  const right = x + width;
  const bottom = y + height;
  const leftGuide = guideIndex === 0 || guideIndex === 2;
  const topGuide = guideIndex === 0 || guideIndex === 1;
  const guideX = leftGuide ? x : right;
  const guideY = topGuide ? y : bottom;
  const horizontalStart = leftGuide ? guideX + inset : right - inset - length;
  const horizontalEnd = leftGuide ? guideX + inset + length : right - inset;
  const verticalStart = topGuide ? guideY + inset : bottom - inset - length;
  const verticalEnd = topGuide ? guideY + inset + length : bottom - inset;

  context.strokeStyle = getPerforatedGuideColor(guideIndex);
  context.lineWidth = 5;
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(horizontalStart, guideY);
  context.lineTo(horizontalEnd, guideY);
  context.moveTo(guideX, verticalStart);
  context.lineTo(guideX, verticalEnd);
  context.stroke();
};

export const getPaperLayout = (settings: PaperStockSettings): PaperLayout => {
  const page = PAGE_SIZES[settings.pageSize];
  const effectiveCardWidth = settings.orientation === 'landscape' ? settings.cardHeight : settings.cardWidth;
  const effectiveCardHeight = settings.orientation === 'landscape' ? settings.cardWidth : settings.cardHeight;
  const autoColumns = Math.max(1, Math.floor((page.width - settings.leftMargin + settings.horizontalGap) / (effectiveCardWidth + settings.horizontalGap)));
  const autoRows = Math.max(1, Math.floor((page.height - settings.topMargin + settings.verticalGap) / (effectiveCardHeight + settings.verticalGap)));
  const columns = settings.stockType === 'perforated' ? settings.columns : autoColumns;
  const rows = settings.stockType === 'perforated' ? settings.rows : autoRows;
  const pageWidth = inchesToPixels(page.width);
  const pageHeight = inchesToPixels(page.height);
  const cardWidth = inchesToPixels(effectiveCardWidth);
  const cardHeight = inchesToPixels(effectiveCardHeight);
  const gapX = inchesToPixels(settings.horizontalGap);
  const gapY = inchesToPixels(settings.verticalGap);
  const centeredLeftMargin = (pageWidth - (columns * cardWidth + (columns - 1) * gapX)) / DPI;
  const centeredTopMargin = (pageHeight - (rows * cardHeight + (rows - 1) * gapY)) / DPI;
  const normalizedSettings = settings.stockType === 'standard'
    ? { ...settings, leftMargin: centeredLeftMargin, topMargin: centeredTopMargin }
    : settings;

  return { ...normalizedSettings, pageWidthInches: page.width, pageHeightInches: page.height, pageWidthPoints: page.width * 72, pageHeightPoints: page.height * 72, pageWidth, pageHeight, effectiveCardWidth: cardWidth, effectiveCardHeight: cardHeight, columns, rows, cardsPerSheet: columns * rows };
};

export const getCardPosition = (layout: PaperLayout, index: number, isBackSide = false) => {
  const row = Math.floor(index / layout.columns);
  const col = index % layout.columns;
  const gapX = inchesToPixels(layout.horizontalGap);
  const gapY = inchesToPixels(layout.verticalGap);
  const marginX = inchesToPixels(layout.leftMargin);
  const baseX = isBackSide ? layout.pageWidth - marginX - ((col + 1) * layout.effectiveCardWidth) - (col * gapX) : marginX + (col * (layout.effectiveCardWidth + gapX));
  const baseY = inchesToPixels(layout.topMargin) + (row * (layout.effectiveCardHeight + gapY));
  const horizontalRatio = layout.columns > 1 ? (isBackSide ? (layout.columns - 1 - col) : col) / (layout.columns - 1) : 0;
  const verticalRatio = layout.rows > 1 ? row / (layout.rows - 1) : 0;
  const topX = layout.cornerOffsets.topLeft.x + (layout.cornerOffsets.topRight.x - layout.cornerOffsets.topLeft.x) * horizontalRatio;
  const bottomX = layout.cornerOffsets.bottomLeft.x + (layout.cornerOffsets.bottomRight.x - layout.cornerOffsets.bottomLeft.x) * horizontalRatio;
  const topY = layout.cornerOffsets.topLeft.y + (layout.cornerOffsets.topRight.y - layout.cornerOffsets.topLeft.y) * horizontalRatio;
  const bottomY = layout.cornerOffsets.bottomLeft.y + (layout.cornerOffsets.bottomRight.y - layout.cornerOffsets.bottomLeft.y) * horizontalRatio;
  const x = baseX + topX + (bottomX - topX) * verticalRatio + PRINT_ALIGNMENT_OFFSET_PX;
  const y = baseY + topY + (bottomY - topY) * verticalRatio + PRINT_ALIGNMENT_OFFSET_PX;
  return { x, y, row, col };
};
export type PageSize = 'letter' | 'a4';
export type CardOrientation = 'portrait' | 'landscape';
export type PaperStockType = 'perforated' | 'standard';

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
  columns: number;
  rows: number;
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
export const DEFAULT_PAPER_STOCK: PaperStockSettings = {
  version: 2,
  stockType: 'perforated',
  pageSize: 'letter', cardWidth: 2, cardHeight: 3.5, orientation: 'landscape',
  topMargin: 0.5, leftMargin: 0.75, horizontalGap: 0, verticalGap: 0, bleed: 0.125,
  columns: 2, rows: 5,
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

export const getPaperLayout = (settings: PaperStockSettings): PaperLayout => {
  const page = PAGE_SIZES[settings.pageSize];
  const effectiveCardWidth = settings.orientation === 'landscape' ? settings.cardHeight : settings.cardWidth;
  const effectiveCardHeight = settings.orientation === 'landscape' ? settings.cardWidth : settings.cardHeight;
  const autoColumns = Math.max(1, Math.floor((page.width - settings.leftMargin + settings.horizontalGap) / (effectiveCardWidth + settings.horizontalGap)));
  const autoRows = Math.max(1, Math.floor((page.height - settings.topMargin + settings.verticalGap) / (effectiveCardHeight + settings.verticalGap)));
  const columns = settings.stockType === 'perforated' ? settings.columns : autoColumns;
  const rows = settings.stockType === 'perforated' ? settings.rows : autoRows;

  return { ...settings, pageWidthInches: page.width, pageHeightInches: page.height, pageWidthPoints: page.width * 72, pageHeightPoints: page.height * 72, pageWidth: inchesToPixels(page.width), pageHeight: inchesToPixels(page.height), effectiveCardWidth: inchesToPixels(effectiveCardWidth), effectiveCardHeight: inchesToPixels(effectiveCardHeight), columns, rows, cardsPerSheet: columns * rows };
};

export const getCardPosition = (layout: PaperLayout, index: number, isBackSide = false) => {
  const row = Math.floor(index / layout.columns);
  const col = index % layout.columns;
  const gapX = inchesToPixels(layout.horizontalGap);
  const gapY = inchesToPixels(layout.verticalGap);
  const marginX = inchesToPixels(layout.leftMargin);
  const x = (isBackSide ? layout.pageWidth - marginX - ((col + 1) * layout.effectiveCardWidth) - (col * gapX) : marginX + (col * (layout.effectiveCardWidth + gapX))) + PRINT_ALIGNMENT_OFFSET_PX;
  const y = inchesToPixels(layout.topMargin) + (row * (layout.effectiveCardHeight + gapY)) + PRINT_ALIGNMENT_OFFSET_PX;
  return { x, y, row, col };
};
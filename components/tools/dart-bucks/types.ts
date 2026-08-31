export interface DenomArtSlot {
  denom: "1" | "5" | "10" | "20";
  title: string;
  artist_name: string;
  image_url: string | null;
}

export interface DenominationStyle {
  value: string;
  label: string;
  bg: string;
  border: string;
  accent: string;
  circleBg: string;
}

export const DENOMINATIONS: Record<string, DenominationStyle> = {
  "1": { value: "1", label: "$1 Bill", bg: "#ffffff", border: "#27272a", accent: "#27272a", circleBg: "#f8fafc" },
  "5": { value: "5", label: "$5 Bill", bg: "#f472b6", border: "#831843", accent: "#831843", circleBg: "#fbcfe8" },
  "10": { value: "10", label: "$10 Bill", bg: "#facc15", border: "#713f12", accent: "#713f12", circleBg: "#fef08a" },
  "20": { value: "20", label: "$20 Bill", bg: "#4ade80", border: "#064e3b", accent: "#064e3b", circleBg: "#bbf7d0" },
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export type PaperSizePreset = "letter" | "a4" | "11x12-14" | "11x12-21";

export interface PaperSpec {
  id: PaperSizePreset;
  label: string;
  widthMm: number;
  heightMm: number;
  cols: number;
  rows: number;
  billsPerSheet: number;
  defaultCardWidthMm: number;
  defaultCardHeightMm: number;
}

export const PAPER_SPECS: Record<PaperSizePreset, PaperSpec> = {
  "letter": {
    id: "letter",
    label: 'US Letter (8.5" × 11")',
    widthMm: 215.9,
    heightMm: 279.4,
    cols: 2,
    rows: 4,
    billsPerSheet: 8,
    defaultCardWidthMm: 98.5,
    defaultCardHeightMm: 61.5,
  },
  "a4": {
    id: "a4",
    label: "A4 Sheet (210 × 297 mm)",
    widthMm: 210.0,
    heightMm: 297.0,
    cols: 2,
    rows: 4,
    billsPerSheet: 8,
    defaultCardWidthMm: 95.0,
    defaultCardHeightMm: 65.0,
  },
  "11x12-14": {
    id: "11x12-14",
    label: 'Custom 11" × 12" (Large 10 Bills)',
    widthMm: 279.4,
    heightMm: 304.8,
    cols: 2,
    rows: 5,
    billsPerSheet: 10,
    defaultCardWidthMm: 122.0,
    defaultCardHeightMm: 56.0,
  },
  "11x12-21": {
    id: "11x12-21",
    label: 'Custom 11" × 12" (Standard 10 Bills)',
    widthMm: 279.4,
    heightMm: 304.8,
    cols: 2,
    rows: 5,
    billsPerSheet: 10,
    defaultCardWidthMm: 101.6,
    defaultCardHeightMm: 50.8,
  },
};

export interface BatchLogItem {
  id: string;
  batch_id: string;
  station_prefix: string;
  issuer_name: string;
  issuer_role: string;
  department: string;
  mode: "single" | "drawer";
  drawer_amount: number;
  total_bills_count: number;
  itemized_breakdown: { bill20: number; bill10: number; bill5: number; bill1: number };
  serial_start: string;
  serial_end: string;
  issue_reason: string;
  printed_at: string;
  status: "active" | "completed" | "shredded";
  completed_at?: string;
  shredded_at?: string;
  /** Storage object path inside the private "dartbucks-pdfs" bucket, e.g. "BATCH123/log_abc.pdf" */
  pdf_url?: string | null;
}

export type BillScalePreset = "medium";

export type DrawerWeightingPreset =
  | "balanced"
  | "heavy20"
  | "heavy10"
  | "heavy5"
  | "heavy1"
  | "only20"
  | "only10"
  | "only5"
  | "only1"
  | "custom";

export interface DartBuckConfig {
  mode: "single" | "drawer";
  drawerAmount: number;
  drawerWeighting: DrawerWeightingPreset;
  drawerBreakdown: { bill20: number; bill10: number; bill5: number; bill1: number };
  stationPrefix: string;
  batchId: string;
  startSerial: number;
  cardCount: number;
  digits: number;
  includeChecksum: boolean;
  theme: "monopoly" | "custom";
  denomination: string;
  watermarkMode: "auto" | "dark" | "light" | "none";
  showPresetBorders: boolean;
  showPresetText: boolean;
  showWatermark: boolean;
  includeDuplexBacks: boolean;
  paperSize: PaperSizePreset;
  billScale: BillScalePreset;
  includeCropMarks: boolean;
  bleedMm: number;
  gutterMm: number;
  previewView: "card" | "sheet-front" | "sheet-back";
  serialPosition: "bottom" | "top" | "bottom-right";
  validityMode: "forever" | "expires";
  expirationDate: string;
  monthOverride?: number; // 0 = Jan, 1 = Feb, ... 11 = Dec, undefined = current month
}

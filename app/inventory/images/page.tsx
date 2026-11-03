"use client";

import { useState } from "react";
import { ImagePlus, Plus, Upload } from "lucide-react";

type ImagePair = {
  id: number;
  sku: string;
  front: File | null;
  back: File | null;
  message: string;
  error: boolean;
};

const initialPairs: ImagePair[] = ["TS-001", "TS-002", "TS-003", "TS-004"].map(
  (sku, index) => ({ id: index + 1, sku, front: null, back: null, message: "", error: false }),
);

export default function GarmentImageUploadPage() {
  const [pairs, setPairs] = useState(initialPairs);
  const [nextId, setNextId] = useState(initialPairs.length + 1);
  const [isUploading, setIsUploading] = useState(false);

  function updatePair(id: number, patch: Partial<ImagePair>) {
    setPairs((current) => current.map((pair) => pair.id === id ? { ...pair, ...patch } : pair));
  }

  async function uploadPair(pair: ImagePair) {
    if (!pair.sku.trim() || !pair.front || !pair.back) {
      updatePair(pair.id, { message: "SKU and both images are required", error: true });
      return;
    }

    updatePair(pair.id, { message: "Uploading...", error: false });
    const formData = new FormData();
    formData.set("sku", pair.sku.trim());
    formData.set("front", pair.front);
    formData.set("back", pair.back);

    try {
      const response = await fetch("/api/inventory/garment-images", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        updatePair(pair.id, { message: result.error ?? "Upload failed", error: true });
        return;
      }

      updatePair(pair.id, { message: "Images saved to Supabase", error: false });
    } catch {
      updatePair(pair.id, { message: "Network error while uploading", error: true });
    }
  }

  async function uploadAll() {
    setIsUploading(true);
    for (const pair of pairs) {
      if (pair.front || pair.back) await uploadPair(pair);
    }
    setIsUploading(false);
  }

  return (
    <main className="min-h-screen bg-[#f4f5f2] px-4 py-8 text-[#1d2825] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-[#cbd3ce] pb-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-[#39705d]">
            <ImagePlus size={17} aria-hidden="true" /> Inventory media
          </div>
          <h1 className="text-3xl font-semibold">Upload garment photos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b6863]">
            Add a front and back image for each SKU. Images are stored in Supabase Storage and their public URLs are saved on the garment record.
          </p>
        </header>

        <section aria-label="Garment image pairs" className="divide-y divide-[#d4dbd6]">
          {pairs.map((pair) => (
            <div key={pair.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(120px,0.7fr)_1fr_1fr_auto] sm:items-end">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#5b6863]">
                SKU
                <input
                  value={pair.sku}
                  onChange={(event) => updatePair(pair.id, { sku: event.target.value })}
                  maxLength={64}
                  className="mt-2 block h-10 w-full rounded border border-[#b8c5bd] bg-white px-3 text-sm font-medium normal-case text-[#1d2825] outline-none focus:border-[#39705d] focus:ring-2 focus:ring-[#39705d]/20"
                  aria-label="Garment SKU"
                />
              </label>

              {(["front", "back"] as const).map((side) => (
                <label key={side} className="block text-xs font-semibold uppercase tracking-wide text-[#5b6863]">
                  {side} image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => updatePair(pair.id, { [side]: event.target.files?.[0] ?? null, message: "" })}
                    className="mt-2 block min-h-10 w-full rounded border border-[#b8c5bd] bg-white px-2 py-2 text-xs normal-case file:mr-2 file:rounded file:border-0 file:bg-[#e6eee9] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-[#315c4d]"
                    aria-label={`${side} image for ${pair.sku || "garment"}`}
                  />
                </label>
              ))}

              <div className="flex min-h-10 items-center sm:justify-end">
                {pair.message && (
                  <span role="status" className={`text-xs ${pair.error ? "text-red-700" : "text-[#39705d]"}`}>
                    {pair.message}
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#cbd3ce] pt-5">
          <button
            type="button"
            onClick={() => {
              setPairs((current) => [...current, { id: nextId, sku: "", front: null, back: null, message: "", error: false }]);
              setNextId((current) => current + 1);
            }}
            disabled={isUploading}
            className="inline-flex h-10 items-center gap-2 rounded border border-[#aebdb4] px-3 text-sm font-medium text-[#315c4d] hover:bg-[#e8eee9] disabled:opacity-50"
          >
            <Plus size={16} aria-hidden="true" /> Add SKU
          </button>
          <button
            type="button"
            onClick={uploadAll}
            disabled={isUploading || !pairs.some((pair) => pair.front || pair.back)}
            className="inline-flex h-10 items-center gap-2 rounded bg-[#285b48] px-4 text-sm font-semibold text-white hover:bg-[#204b3b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={16} aria-hidden="true" />
            {isUploading ? "Uploading..." : "Upload selected pairs"}
          </button>
        </div>
      </div>
    </main>
  );
}
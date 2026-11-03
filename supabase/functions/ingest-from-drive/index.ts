import { createClient } from "jsr:@supabase/supabase-js@2";

const STORAGE_BUCKET = "garment-images";
const MAX_SHIRTS_PER_BATCH = 20;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;
const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;

type ShirtInput = {
  sku: string;
  front: string;
  back: string;
};

async function fetchDriveFile(fileId: string): Promise<ArrayBuffer> {
  const url = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Drive download failed (${response.status})`);

  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "image/png") {
    throw new Error(`Expected a PNG image but Drive returned ${contentType ?? "unknown content"}`);
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image must be larger than 0 bytes and no larger than 6 MB");
  }
  return bytes;
}

function parseShirts(payload: unknown): ShirtInput[] | null {
  if (!payload || typeof payload !== "object" || !("shirts" in payload)) return null;
  const shirts = (payload as { shirts?: unknown }).shirts;
  if (!Array.isArray(shirts) || shirts.length === 0 || shirts.length > MAX_SHIRTS_PER_BATCH) return null;

  const validated: ShirtInput[] = [];
  const seenSkus = new Set<string>();
  for (const shirt of shirts) {
    if (!shirt || typeof shirt !== "object") return null;
    const candidate = shirt as Partial<ShirtInput>;
    if (
      typeof candidate.sku !== "string" ||
      !SKU_PATTERN.test(candidate.sku) ||
      seenSkus.has(candidate.sku) ||
      typeof candidate.front !== "string" ||
      !DRIVE_FILE_ID_PATTERN.test(candidate.front) ||
      typeof candidate.back !== "string" ||
      !DRIVE_FILE_ID_PATTERN.test(candidate.back) ||
      candidate.front === candidate.back
    ) return null;

    seenSkus.add(candidate.sku);
    validated.push({ sku: candidate.sku, front: candidate.front, back: candidate.back });
  }
  return validated;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const shirts = parseShirts(payload);
  if (!shirts) {
    return Response.json({
      error: `Provide 1 to ${MAX_SHIRTS_PER_BATCH} shirts with a unique SKU and front/back Drive file IDs`,
    }, { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Supabase function configuration is missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const results: Array<{ sku: string; side: string; success: boolean; message: string }> = [];

  for (const { sku, front, back } of shirts) {
    for (const [side, fileId] of [["front", front], ["back", back]] as const) {
      const storagePath = `${sku}/${side}.png`;
      try {
        const bytes = await fetchDriveFile(fileId);
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, bytes, {
            contentType: "image/png",
            cacheControl: "31536000",
            upsert: true,
          });
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);
        const column = side === "front" ? "front_image_url" : "back_image_url";
        const { data: updated, error: databaseError } = await supabase
          .from("garments")
          .update({ [column]: publicUrl })
          .eq("sku", sku)
          .select("id");

        if (databaseError) throw new Error(`Database update failed: ${databaseError.message}`);
        if (!updated || updated.length !== 1) {
          throw new Error(`Expected exactly one garment row for SKU ${sku}; found ${updated?.length ?? 0}`);
        }

        results.push({ sku, side, success: true, message: publicUrl });
      } catch (error) {
        results.push({
          sku,
          side,
          success: false,
          message: error instanceof Error ? error.message : "Unknown upload error",
        });
      }
    }
  }

  const hasErrors = results.some((result) => !result.success);
  return Response.json({ results }, { status: hasErrors ? 207 : 200 });
});
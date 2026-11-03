import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

const BUCKET = "garment-images";
const MAX_FILE_SIZE = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isImageFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

async function ensureBucket(storage: any) {
  const { data: bucket } = await storage.getBucket(BUCKET);
  if (bucket) {
    if (!bucket.public) throw new Error("The garment image bucket must be public");
    return;
  }

  const { error } = await storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: [...ALLOWED_TYPES],
  });

  if (!error) return;

  const { data: createdByAnotherRequest } = await storage.getBucket(BUCKET);
  if (!createdByAnotherRequest?.public) throw error;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const sku = String(formData.get("sku") ?? "").trim();
  const front = formData.get("front");
  const back = formData.get("back");

  if (!/^[A-Za-z0-9._-]{1,64}$/.test(sku)) {
    return NextResponse.json({ error: "Enter a valid garment SKU" }, { status: 400 });
  }
  if (!isImageFile(front) || !isImageFile(back)) {
    return NextResponse.json({ error: "Choose both a front and back image" }, { status: 400 });
  }

  for (const [side, file] of [["front", front], ["back", back]] as const) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `${side} image must be JPG, PNG, or WebP` }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `${side} image must be under 6 MB` }, { status: 400 });
    }
  }

  const serviceClient = auth.serviceClient;
  const garments = (serviceClient as any).from("garments");
  const { data: garment, error: lookupError } = await garments
    .select("id, sku")
    .eq("sku", sku)
    .maybeSingle();

  if (lookupError) {
    console.error("Garment lookup failed:", lookupError);
    return NextResponse.json({ error: "Could not look up this garment" }, { status: 500 });
  }
  if (!garment) {
    return NextResponse.json({ error: `No garment found for SKU ${sku}` }, { status: 404 });
  }

  const extension = (type: string) => ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  })[type]!;
  const paths = {
    front: `${sku}/${randomUUID()}-front.${extension(front.type)}`,
    back: `${sku}/${randomUUID()}-back.${extension(back.type)}`,
  };

  try {
    await ensureBucket(serviceClient.storage);
  } catch (error) {
    console.error("Garment image bucket setup failed:", error);
    return NextResponse.json({ error: "Could not prepare image storage" }, { status: 500 });
  }

  const uploads = await Promise.all([
    serviceClient.storage.from(BUCKET).upload(paths.front, front, {
      contentType: front.type,
      cacheControl: "31536000",
      upsert: false,
    }),
    serviceClient.storage.from(BUCKET).upload(paths.back, back, {
      contentType: back.type,
      cacheControl: "31536000",
      upsert: false,
    }),
  ]);

  const uploadedPaths = uploads.flatMap((result, index) =>
    result.error ? [] : [index === 0 ? paths.front : paths.back],
  );

  if (uploads.some((result) => result.error)) {
    await serviceClient.storage.from(BUCKET).remove(uploadedPaths);
    console.error("Garment image upload failed:", uploads.map((result) => result.error));
    return NextResponse.json({ error: "Could not upload both images" }, { status: 500 });
  }

  const frontUrl = serviceClient.storage.from(BUCKET).getPublicUrl(paths.front).data.publicUrl;
  const backUrl = serviceClient.storage.from(BUCKET).getPublicUrl(paths.back).data.publicUrl;
  const { data: updated, error: updateError } = await garments
    .update({ front_image_url: frontUrl, back_image_url: backUrl })
    .eq("id", garment.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    await serviceClient.storage.from(BUCKET).remove(uploadedPaths);
    console.error("Garment image URL update failed:", updateError);
    return NextResponse.json({ error: "Images uploaded but garment URLs could not be saved" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sku: garment.sku, frontUrl, backUrl });
}
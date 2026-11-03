# Manual garment image upload

This function does not scan Drive, run on a schedule, allocate SKUs, or archive files. When a new batch is ready, provide the new front/back Drive file IDs and SKUs in a `POST` request:

```json
{
  "shirts": [
    { "sku": "TS-005", "front": "DRIVE_FRONT_FILE_ID", "back": "DRIVE_BACK_FILE_ID" }
  ]
}
```

Drive images must be PNGs accessible by the function's public download URL. Each image is uploaded to `garment-images/{SKU}/{front|back}.png`, then its public URL is written to the matching `garments` row. The function accepts batches of up to 20 shirts and reports each side's result separately.

Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into the Edge Function; no Google OAuth or additional function secrets are used.

## Access warning

If deployed with JWT verification disabled and no caller authentication, anyone who discovers the function URL can invoke it. The Supabase service-role key stays server-side, but the function becomes a public write endpoint for the listed storage paths and garment image URL columns. Do not treat the anon key as a secret. For a production deployment, enable JWT verification and restrict calls to trusted signed-in administrators, or retain other endpoint access controls.
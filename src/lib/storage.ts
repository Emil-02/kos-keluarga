import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

type Bucket = "public-images" | "documents";

export function isFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && value.size > 0;
}

/** Validasi file; mengembalikan pesan error atau null. */
export function validateFile(file: File, opts: { allowPdf?: boolean } = {}) {
  const allowed = opts.allowPdf ? ALLOWED_DOC_TYPES : ALLOWED_IMAGE_TYPES;
  if (!allowed.includes(file.type)) {
    return opts.allowPdf ? "Format file harus JPG, PNG, WEBP, atau PDF." : "Format gambar harus JPG, PNG, atau WEBP.";
  }
  if (file.size > MAX_UPLOAD_BYTES) return "Ukuran file maksimal 4 MB.";
  return null;
}

export class FileValidationError extends Error {}

/** Cek isi file (magic bytes) agar file palsu yang hanya diganti namanya ditolak. */
async function detectType(file: File) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  if (String.fromCharCode(...b.slice(0, 4)) === "%PDF") return "application/pdf";
  return null;
}

function extensionFor(file: File) {
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "jpg";
  }
}

/**
 * Upload file ke storage (server-side). Mengembalikan path di dalam bucket.
 * Melempar FileValidationError jika isi file tidak sesuai jenisnya.
 */
export async function uploadFile(bucket: Bucket, folder: string, file: File) {
  const actualType = await detectType(file);
  if (!actualType || actualType !== file.type) {
    throw new FileValidationError("File tidak valid atau rusak. Unggah foto JPG/PNG/WEBP (atau PDF) yang asli.");
  }
  const supabase = createAdminClient();
  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Gagal mengunggah file: ${error.message}`);
  return path;
}

export async function removeFiles(bucket: Bucket, paths: (string | null | undefined)[]) {
  const valid = paths.filter((p): p is string => Boolean(p));
  if (valid.length === 0) return;
  await createAdminClient().storage.from(bucket).remove(valid);
}

/** URL sementara (1 jam) untuk file privat. Panggil hanya setelah otorisasi dicek. */
export async function signedUrl(path: string | null | undefined, expiresIn = 3600) {
  if (!path) return null;
  const { data } = await createAdminClient().storage.from("documents").createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function signedUrls(paths: (string | null | undefined)[], expiresIn = 3600) {
  const valid = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (valid.length === 0) return {} as Record<string, string>;
  const { data } = await createAdminClient().storage.from("documents").createSignedUrls(valid, expiresIn);
  const map: Record<string, string> = {};
  data?.forEach((item) => {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  });
  return map;
}

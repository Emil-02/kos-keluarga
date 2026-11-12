"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

const MAX_DIMENSION = 1600;
const TARGET_BYTES = 1.5 * 1024 * 1024;

/** Perkecil foto di browser agar upload cepat dan tidak melebihi batas server. */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size <= TARGET_BYTES && file.type !== "image/heic") {
    const bitmapCheck = await createImageBitmap(file).catch(() => null);
    if (bitmapCheck && Math.max(bitmapCheck.width, bitmapCheck.height) <= MAX_DIMENSION) return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

type Props = Omit<ComponentProps<"input">, "type"> & { allowPdf?: boolean };

/** Input file yang otomatis mengompres gambar sebelum form dikirim. */
export function FileInput({ allowPdf, className, onChange, ...props }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setPreview(null);
      setInfo(null);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    setPreview(null);
    setInfo(null);
    if (!file) return;

    let finalFile = file;
    if (file.type.startsWith("image/")) {
      setInfo("Memproses gambar…");
      finalFile = await compressImage(file);
      if (finalFile !== file) {
        const dt = new DataTransfer();
        dt.items.add(finalFile);
        input.files = dt.files;
      }
      setPreview(URL.createObjectURL(finalFile));
    }
    setInfo(`${finalFile.name} · ${(finalFile.size / 1024).toFixed(0)} KB`);
    onChange?.(e);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={allowPdf ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"}
        className={cn(
          "block w-full cursor-pointer rounded-xl border border-dashed border-stone-300 bg-white p-2 text-sm text-stone-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100",
          className,
        )}
        onChange={handleChange}
        {...props}
      />
      {info && <p className="mt-1 text-xs text-stone-500">{info}</p>}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Pratinjau" className="mt-2 max-h-40 rounded-lg border border-stone-200 object-contain" />
      )}
    </div>
  );
}

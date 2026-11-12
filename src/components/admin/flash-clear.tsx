"use client";

import { useEffect } from "react";

/** Menghapus cookie flash setelah pesan ditampilkan. */
export function FlashClear() {
  useEffect(() => {
    void fetch("/api/flash", { method: "DELETE" });
  }, []);
  return null;
}

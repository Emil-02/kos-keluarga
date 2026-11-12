"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { whatsappLink } from "@/lib/format";

export function ContactForm({ whatsapp, kosName }: { whatsapp: string; kosName: string }) {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("nama") ?? "").trim();
    const message = String(data.get("pesan") ?? "").trim();
    if (!name || !message) return;
    const text = `Halo pengelola ${kosName}, saya ${name}.\n\n${message}`;
    window.open(whatsappLink(whatsapp, text), "_blank", "noopener,noreferrer");
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nama" htmlFor="nama" required>
        <Input id="nama" name="nama" required maxLength={80} autoComplete="name" placeholder="Nama Anda" />
      </Field>
      <Field label="Pesan" htmlFor="pesan" required>
        <Textarea
          id="pesan"
          name="pesan"
          required
          maxLength={1000}
          rows={5}
          placeholder="Contoh: Apakah masih ada kamar kosong untuk bulan depan?"
        />
      </Field>
      <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">
        <Send className="size-4" aria-hidden /> Kirim via WhatsApp
      </Button>
      {sent && (
        <p className="text-sm text-stone-500" role="status">
          WhatsApp telah dibuka di tab baru. Jika tidak muncul, pastikan pop-up tidak diblokir browser.
        </p>
      )}
    </form>
  );
}

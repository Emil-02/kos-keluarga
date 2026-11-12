import type { Metadata } from "next";
import Image from "next/image";
import { Star } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FileInput } from "@/components/ui/file-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { FACILITY_ICON_OPTIONS, FacilityIcon } from "@/components/facility-icon";
import {
  deleteFacilityAction,
  deleteGalleryAction,
  deleteTestimonialAction,
  saveFacilityAction,
  saveTestimonialAction,
  updateGalleryAction,
  uploadGalleryAction,
} from "@/actions/admin/manage";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/format";
import type { Facility, Testimonial } from "@/lib/types";

export const metadata: Metadata = { title: "Konten Website" };

export default async function ContentPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: gallery }, { data: facilities }, { data: testimonials }] = await Promise.all([
    supabase.from("gallery").select("*").order("sort_order").order("created_at"),
    supabase.from("facilities").select("*").order("sort_order"),
    supabase.from("testimonials").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Konten Website" description="Foto galeri, fasilitas, dan testimoni yang tampil di halaman publik." />

      <Card id="galeri">
        <CardHeader title="Galeri foto" description="Foto kamar, kamar mandi, area bersama, tampak depan, dll." />
        <CardBody>
          <ActionForm action={uploadGalleryAction} className="mb-6 grid gap-3 rounded-2xl bg-stone-50 p-4 md:grid-cols-[2fr_2fr_1fr_auto] md:items-end" resetOnSuccess>
            <Field label="Foto" htmlFor="g_image">
              <FileInput id="g_image" name="image" required />
            </Field>
            <Field label="Keterangan" htmlFor="g_caption">
              <Input id="g_caption" name="caption" placeholder="Contoh: Kamar tampak depan" />
            </Field>
            <Field label="Urutan" htmlFor="g_sort">
              <Input id="g_sort" name="sort_order" type="number" defaultValue={(gallery?.length ?? 0) + 1} />
            </Field>
            <SubmitButton pendingText="Mengunggah…">Unggah</SubmitButton>
          </ActionForm>

          {gallery?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {gallery.map((g) => (
                <div key={g.id} className="overflow-hidden rounded-2xl border border-stone-200">
                  <div className="relative aspect-[4/3] bg-stone-100">
                    <Image src={publicImageUrl(g.image_path)!} alt={g.caption ?? "Foto kos"} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
                  </div>
                  <ActionForm action={updateGalleryAction} className="space-y-2 p-3" showMessage={false}>
                    <input type="hidden" name="id" value={g.id} />
                    <Input name="caption" defaultValue={g.caption ?? ""} placeholder="Keterangan" aria-label="Keterangan" />
                    <div className="flex gap-2">
                      <Input name="sort_order" type="number" defaultValue={g.sort_order} className="w-20" aria-label="Urutan" />
                      <SubmitButton size="sm" variant="secondary">
                        Simpan
                      </SubmitButton>
                    </div>
                  </ActionForm>
                  <ActionForm action={deleteGalleryAction} className="px-3 pb-3" showMessage={false}>
                    <input type="hidden" name="id" value={g.id} />
                    <SubmitButton size="sm" variant="ghost" className="text-red-600" confirm="Hapus foto ini?">
                      Hapus
                    </SubmitButton>
                  </ActionForm>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">Belum ada foto. Website menampilkan gambar ilustrasi sampai Anda mengunggah foto.</p>
          )}
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card id="fasilitas">
          <CardHeader title="Fasilitas" description="Centang 'fasilitas kamar' untuk yang ada di dalam kamar." />
          <CardBody className="space-y-3">
            {facilities?.map((f) => (
              <details key={f.id} className="rounded-xl border border-stone-200">
                <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
                  <FacilityIcon name={f.icon} className="size-5 text-brand-600" />
                  <span className="font-medium">{f.name}</span>
                  {f.is_room_facility && <span className="text-xs text-stone-500">(kamar)</span>}
                </summary>
                <div className="space-y-3 border-t border-stone-100 p-4">
                  <FacilityForm facility={f} />
                  <ActionForm action={deleteFacilityAction} showMessage={false}>
                    <input type="hidden" name="id" value={f.id} />
                    <SubmitButton size="sm" variant="ghost" className="text-red-600" confirm={`Hapus fasilitas ${f.name}?`}>
                      Hapus
                    </SubmitButton>
                  </ActionForm>
                </div>
              </details>
            ))}
            <div className="rounded-xl bg-stone-50 p-4">
              <p className="mb-3 text-sm font-semibold text-stone-800">Tambah fasilitas</p>
              <FacilityForm />
            </div>
          </CardBody>
        </Card>

        <Card id="testimoni">
          <CardHeader title="Testimoni" description="Ulasan penghuni yang ditampilkan di beranda." />
          <CardBody className="space-y-3">
            {testimonials?.map((t) => (
              <details key={t.id} className="rounded-xl border border-stone-200">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="flex text-accent-500">
                    {Array.from({ length: t.rating }, (_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </span>
                  {!t.is_published && <span className="text-xs text-stone-500">(disembunyikan)</span>}
                </summary>
                <div className="space-y-3 border-t border-stone-100 p-4">
                  <TestimonialForm testimonial={t} />
                  <ActionForm action={deleteTestimonialAction} showMessage={false}>
                    <input type="hidden" name="id" value={t.id} />
                    <SubmitButton size="sm" variant="ghost" className="text-red-600" confirm="Hapus testimoni ini?">
                      Hapus
                    </SubmitButton>
                  </ActionForm>
                </div>
              </details>
            ))}
            <div className="rounded-xl bg-stone-50 p-4">
              <p className="mb-3 text-sm font-semibold text-stone-800">Tambah testimoni</p>
              <TestimonialForm />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function FacilityForm({ facility }: { facility?: Facility }) {
  const p = facility?.id ?? "new-f";
  return (
    <ActionForm action={saveFacilityAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={!facility}>
      {facility && <input type="hidden" name="id" value={facility.id} />}
      <Field label="Nama" htmlFor={`${p}-name`}>
        <Input id={`${p}-name`} name="name" defaultValue={facility?.name} required />
      </Field>
      <Field label="Ikon" htmlFor={`${p}-icon`}>
        <Select id={`${p}-icon`} name="icon" defaultValue={facility?.icon ?? "check"}>
          {FACILITY_ICON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Keterangan" htmlFor={`${p}-desc`} className="sm:col-span-2">
        <Input id={`${p}-desc`} name="description" defaultValue={facility?.description ?? ""} />
      </Field>
      <Field label="Urutan" htmlFor={`${p}-sort`}>
        <Input id={`${p}-sort`} name="sort_order" type="number" min={0} defaultValue={facility?.sort_order ?? 0} />
      </Field>
      <div className="flex items-end pb-2">
        <Checkbox name="is_room_facility" defaultChecked={facility?.is_room_facility} label="Fasilitas di dalam kamar" />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton size="sm">{facility ? "Simpan" : "Tambah"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function TestimonialForm({ testimonial }: { testimonial?: Testimonial }) {
  const p = testimonial?.id ?? "new-t";
  return (
    <ActionForm action={saveTestimonialAction} className="space-y-3" resetOnSuccess={!testimonial}>
      {testimonial && <input type="hidden" name="id" value={testimonial.id} />}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Nama" htmlFor={`${p}-name`}>
          <Input id={`${p}-name`} name="name" defaultValue={testimonial?.name} placeholder="Rina, mahasiswi" required />
        </Field>
        <Field label="Rating" htmlFor={`${p}-rating`}>
          <Select id={`${p}-rating`} name="rating" defaultValue={String(testimonial?.rating ?? 5)}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Isi" htmlFor={`${p}-content`}>
        <Textarea id={`${p}-content`} name="content" rows={3} defaultValue={testimonial?.content} required />
      </Field>
      <Checkbox name="is_published" defaultChecked={testimonial?.is_published ?? true} label="Tampilkan di website" />
      <div>
        <SubmitButton size="sm">{testimonial ? "Simpan" : "Tambah"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

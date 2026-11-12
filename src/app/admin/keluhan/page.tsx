import type { Metadata } from "next";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui/card";
import { Checkbox, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ComplaintStatusBadge } from "@/components/admin/badges";
import { updateComplaintAction } from "@/actions/admin/manage";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Keluhan" };

const TABS = [
  { key: "aktif", label: "Belum selesai" },
  { key: "selesai", label: "Selesai" },
  { key: "semua", label: "Semua" },
] as const;

export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab)?.key ?? "aktif";
  const supabase = await createClient();

  let query = supabase
    .from("complaints")
    .select("*, rooms(number), profiles!complaints_tenant_id_fkey(full_name, phone)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (active === "aktif") query = query.in("status", ["baru", "diproses"]);
  if (active === "selesai") query = query.eq("status", "selesai");
  const { data: complaints } = await query;
  const urls = await signedUrls((complaints ?? []).map((c) => c.photo_path));

  return (
    <>
      <PageHeader title="Keluhan & Laporan Kerusakan" description="Laporan dari penghuni melalui portal." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/keluhan?tab=${t.key}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              active === t.key ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {complaints?.length ? (
        <div className="space-y-4">
          {complaints.map((c) => {
            const photo = c.photo_path ? urls[c.photo_path] : null;
            return (
              <Card key={c.id}>
                <CardBody className="flex flex-col gap-4 md:flex-row">
                  {photo && (
                    <a href={photo} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={`Foto laporan ${c.title}`} className="h-32 w-40 rounded-xl border border-stone-200 object-cover" />
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-stone-900">{c.title}</h3>
                      <ComplaintStatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-stone-500">
                      {c.profiles?.full_name} {c.rooms && `· Kamar ${c.rooms.number}`} · {formatDateTime(c.created_at)}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-stone-700">{c.description}</p>
                  </div>
                  <ActionForm action={updateComplaintAction} className="w-full space-y-2 md:w-72">
                    <input type="hidden" name="id" value={c.id} />
                    <Select name="status" defaultValue={c.status} aria-label="Status">
                      <option value="baru">Baru</option>
                      <option value="diproses">Sedang diproses</option>
                      <option value="selesai">Selesai</option>
                    </Select>
                    <Textarea name="admin_response" rows={2} defaultValue={c.admin_response ?? ""} placeholder="Tanggapan untuk penghuni" aria-label="Tanggapan" />
                    <Checkbox name="notify" defaultChecked label="Beri tahu penghuni" />
                    <SubmitButton size="sm" className="w-full">
                      Simpan
                    </SubmitButton>
                  </ActionForm>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<Wrench className="size-6" />} title="Tidak ada laporan" />
        </Card>
      )}
    </>
  );
}

import type { Metadata } from "next";
import { MessageSquareReply, Wrench } from "lucide-react";
import { ComplaintForm } from "@/components/tenant/complaint-form";
import { ComplaintStatusBadge } from "@/components/tenant/badges";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { requireTenant } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Keluhan" };

export default async function TenantComplaintsPage() {
  const { user } = await requireTenant();
  const supabase = await createClient();

  const { data } = await supabase
    .from("complaints")
    .select("id, title, description, photo_path, status, admin_response, created_at, updated_at, rooms(number)")
    .eq("tenant_id", user.id)
    .order("created_at", { ascending: false });
  const complaints = data ?? [];
  // hanya foto dari keluhan milik penghuni ini (sudah difilter RLS + tenant_id)
  const photoUrls = await signedUrls(complaints.map((c) => c.photo_path));

  return (
    <div>
      <PageHeader title="Keluhan & laporan" description="Laporkan kerusakan atau masalah di kamar/fasilitas. Pengelola akan menindaklanjuti." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="h-fit lg:sticky lg:top-6 lg:col-span-2">
          <CardHeader title="Buat laporan baru" />
          <CardBody>
            <ComplaintForm />
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Laporan saya" description={`${complaints.length} laporan`} />
          {complaints.length === 0 ? (
            <EmptyState icon={<Wrench className="size-6" />} title="Belum ada laporan" description="Semoga semuanya nyaman ya! Laporkan jika ada yang perlu diperbaiki." />
          ) : (
            <ul className="divide-y divide-stone-100">
              {complaints.map((c) => {
                const url = c.photo_path ? photoUrls[c.photo_path] : null;
                return (
                  <li key={c.id} className="px-5 py-4">
                    <div className="flex gap-4">
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0" title="Lihat foto">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Foto: ${c.title}`} className="size-16 rounded-lg border border-stone-200 object-cover" />
                        </a>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-stone-900">{c.title}</p>
                          <ComplaintStatusBadge status={c.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-stone-400">
                          {formatDateTime(c.created_at)}
                          {c.rooms?.number ? ` · Kamar ${c.rooms.number}` : ""}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm text-stone-700">{c.description}</p>
                      </div>
                    </div>
                    {c.admin_response && (
                      <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                          <MessageSquareReply className="size-3.5" /> Tanggapan pengelola · {formatDate(c.updated_at, { short: true })}
                        </p>
                        <p className="mt-1 whitespace-pre-line">{c.admin_response}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

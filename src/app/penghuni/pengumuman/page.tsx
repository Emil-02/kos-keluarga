import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { requireTenant } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pengumuman" };

export default async function TenantAnnouncementsPage() {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false });
  const announcements = data ?? [];

  return (
    <div>
      <PageHeader title="Pengumuman" description="Informasi terbaru dari pengelola kos." />
      {announcements.length === 0 ? (
        <Card>
          <EmptyState icon={<Megaphone className="size-6" />} title="Belum ada pengumuman" />
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id} className="p-5">
              <article>
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-accent-500/10 p-2 text-accent-600">
                    <Megaphone className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-stone-900">{a.title}</h2>
                    <p className="text-xs text-stone-400">{formatDateTime(a.created_at)}</p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-700">{a.body}</p>
                  </div>
                </div>
              </article>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAnnouncementAction, deleteAnnouncementAction } from "@/actions/admin/manage";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Pengumuman" };

export default async function AnnouncementsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: announcements } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(100);

  return (
    <>
      <PageHeader title="Pengumuman" description="Informasi untuk seluruh penghuni, tampil di portal dan bisa dikirim via WhatsApp/email." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="h-fit lg:col-span-2">
          <CardHeader title="Buat pengumuman" />
          <CardBody>
            <ActionForm action={createAnnouncementAction} className="space-y-3" resetOnSuccess>
              <Field label="Judul" htmlFor="a_title" required>
                <Input id="a_title" name="title" placeholder="Contoh: Pemadaman air hari Minggu" required />
              </Field>
              <Field label="Isi" htmlFor="a_body" required>
                <Textarea id="a_body" name="body" rows={6} required />
              </Field>
              <Checkbox name="notify" defaultChecked label="Kirim juga ke WhatsApp/email penghuni aktif" />
              <SubmitButton pendingText="Mengirim…">Terbitkan</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {announcements?.length ? (
            announcements.map((a) => (
              <Card key={a.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-stone-900">{a.title}</h3>
                      <p className="text-xs text-stone-500">
                        {formatDateTime(a.created_at)}{" "}
                        {a.sent_notification && (
                          <Badge tone="brand" className="ml-1">
                            terkirim WA/email
                          </Badge>
                        )}
                      </p>
                    </div>
                    <ActionForm action={deleteAnnouncementAction} showMessage={false}>
                      <input type="hidden" name="id" value={a.id} />
                      <SubmitButton size="sm" variant="ghost" className="text-red-600" confirm="Hapus pengumuman ini?">
                        Hapus
                      </SubmitButton>
                    </ActionForm>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-stone-700">{a.body}</p>
                </CardBody>
              </Card>
            ))
          ) : (
            <Card>
              <EmptyState icon={<Megaphone className="size-6" />} title="Belum ada pengumuman" />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

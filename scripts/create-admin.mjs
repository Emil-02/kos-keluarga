// Membuat (atau menjadikan) akun admin pengelola kos.
// Pemakaian: npm run create-admin -- email@domain.com "PasswordKuat123" "Nama Pengelola"
import { createClient } from "@supabase/supabase-js";

const [email, password, fullName = "Pengelola Kos"] = process.argv.slice(2);
if (!email || !password) {
  console.error('Pemakaian: npm run create-admin -- <email> <password> ["Nama Lengkap"]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY wajib diatur (lihat .env.local).");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false } });

let userId;
const { data: created, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (error) {
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!existing) {
    console.error("Gagal membuat user:", error.message);
    process.exit(1);
  }
  userId = existing.id;
  console.log("User sudah ada, menjadikan admin…");
} else {
  userId = created.user.id;
}

const { error: roleError } = await supabase
  .from("profiles")
  .update({ role: "admin", full_name: fullName })
  .eq("id", userId);
if (roleError) {
  console.error("Gagal mengubah role:", roleError.message);
  process.exit(1);
}

console.log(`✔ Admin siap: ${email}`);

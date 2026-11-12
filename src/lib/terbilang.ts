const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

const SKALA = [
  { value: 1_000_000_000_000, word: "triliun" },
  { value: 1_000_000_000, word: "miliar" },
  { value: 1_000_000, word: "juta" },
];

function bawahSeribu(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  if (n < 100) {
    const sisa = n % 10;
    return `${SATUAN[Math.floor(n / 10)]} puluh${sisa ? ` ${SATUAN[sisa]}` : ""}`;
  }
  const ratus = Math.floor(n / 100);
  const sisa = n % 100;
  const depan = ratus === 1 ? "seratus" : `${SATUAN[ratus]} ratus`;
  return sisa ? `${depan} ${bawahSeribu(sisa)}` : depan;
}

function susun(n: number): string {
  for (const { value, word } of SKALA) {
    if (n >= value) {
      const depan = Math.floor(n / value);
      const sisa = n % value;
      return [`${susun(depan)} ${word}`, sisa ? susun(sisa) : ""].filter(Boolean).join(" ");
    }
  }
  if (n >= 1000) {
    const ribu = Math.floor(n / 1000);
    const sisa = n % 1000;
    const depan = ribu === 1 ? "seribu" : `${bawahSeribu(ribu)} ribu`;
    return sisa ? `${depan} ${bawahSeribu(sisa)}` : depan;
  }
  return bawahSeribu(n);
}

/** Mengubah bilangan bulat menjadi kata dalam Bahasa Indonesia, mis. 1250 → "seribu dua ratus lima puluh". */
export function terbilang(value: number): string {
  const n = Math.trunc(Math.abs(value));
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "nol";
  const kata = susun(n);
  return value < 0 ? `minus ${kata}` : kata;
}

/** Contoh: 1.250.000 → "satu juta dua ratus lima puluh ribu rupiah". */
export function terbilangRupiah(value: number): string {
  return `${terbilang(value)} rupiah`;
}

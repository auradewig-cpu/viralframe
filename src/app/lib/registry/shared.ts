// Helper generik dipakai lintas content type (youtube_long, thumbnail_pack, content_calendar) —
// versi content-type-agnostic dari parseAiResponse/checkPolicyCompliance di jsonParser.ts/policyCheck.ts
// yang aslinya diketik khusus untuk VideoJSON.

export function parseJsonResponse<T>(rawText: string): T | null {
  try { return JSON.parse(rawText) as T; } catch { /* lanjut ke fallback */ }
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(rawText.slice(start, end + 1)) as T; } catch { /* gagal juga */ }
  }
  return null;
}

interface GenericPolicyRule {
  pattern: RegExp;
  category: string;
  suggestion: string;
}

const GENERIC_POLICY_RULES: GenericPolicyRule[] = [
  {
    pattern: /\b(dijamin|jamin(?:an)? 100%|pasti (?:untung|berhasil|sembuh|naik)|100% (?:aman|berhasil|ampuh|original)|terbaik|nomor (?:1|satu)|no\.? ?1|paling (?:murah|ampuh|efektif|bagus)|guaranteed|the best|number one|cures?|clinically proven|instant results?)\b/gi,
    category: 'Klaim absolut',
    suggestion: 'Ubah jadi observasi netral, mis. "banyak dipilih konsumen" alih-alih "nomor 1".',
  },
  {
    pattern: /\b(menyembuhkan|sembuh total|obat (?:ampuh|mujarab)|terbukti klinis|tanpa efek samping)\b/gi,
    category: 'Klaim medis/kesehatan',
    suggestion: 'Ganti dengan bahasa netral, mis. "diformulasikan untuk merawat".',
  },
];

const GROWTH_MODE_WORDS = /\b(beli(?:lah)?|checkout|check ?out|keranjang|link (?:di )?bio|promo|diskon|harga (?:spesial|khusus)|order sekarang|gratis ongkir|cod|flash sale)\b/gi;

// Scan sekumpulan teks bebas (judul, deskripsi, script outline, caption, dst) untuk kata yang
// melanggar POLICY COMPLIANCE. Dipakai content type baru yang skema outputnya tidak berbentuk VideoJSON
// sehingga tidak bisa memakai checkPolicyCompliance (yang mengasumsikan field scene/caption_variations).
export function scanTextsForPolicyViolations(texts: (string | null | undefined)[], contentGoal?: string): string[] {
  const violations: string[] = [];
  const rules = contentGoal === 'growth'
    ? [...GENERIC_POLICY_RULES, { pattern: GROWTH_MODE_WORDS, category: 'Bahasa komersial (Mode Growth)', suggestion: 'Mode Growth melarang bahasa jualan — ganti dengan ajakan follow/save/share.' }]
    : GENERIC_POLICY_RULES;
  for (const text of texts) {
    if (!text) continue;
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rule.pattern.exec(text)) !== null) {
        violations.push(`POLICY [${rule.category}] "${m[0]}" — ${rule.suggestion}`);
      }
    }
  }
  return violations;
}

export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Blok instruksi POLICY COMPLIANCE yang dipakai ulang di semua master prompt content type baru —
// mengikuti pola persis blok yang sama di masterPrompt.ts (short_video) agar konsisten.
export const POLICY_COMPLIANCE_BLOCK = `POLICY COMPLIANCE — WAJIB dipatuhi di semua teks (judul, deskripsi, narasi, caption, prompt visual):
FORBIDDEN PATTERNS — JANGAN pernah gunakan:
✗ Klaim absolut: "terbaik", "nomor 1", "paling xxx", "jamin 100%", "dijamin", "pasti"
✗ Klaim medis/kesehatan: "sembuh total", "menyembuhkan", "terbukti klinis", "efek samping", "obat", "terapi"
✗ Testimonial fiktif yang terlihat seperti nyata
✗ Klaim performa tanpa bukti: "meningkatkan X dalam Y hari", "instant results"
✗ Kata kasar, konten dewasa, kekerasan, diskriminasi
WAJIB rewrite klaim jadi observasi netral. REWRITE TEST: "Apakah ini akan ditolak platform?" Jika ya, rewrite.`;

export function contentGoalInstructionBlock(contentGoal: string): string {
  if (contentGoal === 'growth') {
    return `TUJUAN KONTEN: 🌱 GROWTH AKUN — akun masih baru, WAJIB kejar follow/save/share, TANPA bahasa jualan sama sekali.
DILARANG KERAS kata/frasa komersial: "beli", "checkout", "keranjang", "link bio", "promo", "diskon", "order", "cod", "gratis ongkir". Format WAJIB value-first: edukasi jujur, rekomendasi/review netral.`;
  }
  if (contentGoal === 'engagement') {
    return `TUJUAN KONTEN: 💬 ENGAGEMENT — prioritaskan komentar & interaksi. Hook dan CTA diarahkan memancing penonton berkomentar.`;
  }
  return `TUJUAN KONTEN: 💰 KONVERSI — perilaku standar, CTA boleh eksplisit sesuai niche.`;
}

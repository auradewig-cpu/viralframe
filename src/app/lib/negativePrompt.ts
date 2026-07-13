// Konstanta reusable — dipakai masterPrompt.ts (generate awal), sceneRegen.ts (Tugas 1: regenerate
// per-scene), dan prompt auto-rephrase (Tugas 3). JANGAN copy-paste teks ini, selalu import dari sini
// supaya locked/flexible/negative-prompt rules konsisten di semua jalur generate short_video.
export const NEGATIVE_PROMPT_BLOCK = `[LOCKED PARAMETERS — TIDAK BOLEH BERUBAH ANTAR SCENE]
Elemen berikut WAJIB identik persis di semua scene, tidak boleh bervariasi:
- Identitas & deskripsi karakter/tangan (character_sheet.description)
- Bentuk, warna, dan desain produk
- Lokasi/setting dasar
- Arah dan suhu cahaya (lighting direction & color temperature)
- Wardrobe/pakaian karakter
- Color grading keseluruhan

[FLEXIBLE — BOLEH BERVARIASI NATURAL ANTAR SCENE]
Elemen berikut boleh berubah wajar mengikuti konteks scene:
- Micro-gesture dan gerakan tangan/tubuh kecil
- Sudut kamera minor (angle, framing sedikit berbeda)
- Ekspresi natural yang mengikuti emosi scene
- Framing/komposisi shot

[NEGATIVE PROMPT — WAJIB TERSIRAT DI SETIAP ai_ready_prompt]
Tulis ai_ready_prompt sedemikian rupa sehingga TIDAK memicu AI video tool menghasilkan:
- Perubahan bentuk/warna/desain produk dari yang sudah ditentukan
- Objek atau orang tambahan yang tidak diminta muncul di frame
- Anatomi tangan/wajah yang rusak/aneh (extra fingers, distorted face)
- Teks acak/tidak terbaca muncul di background
- Perubahan wardrobe atau lighting dari scene sebelumnya
Untuk AI video tool yang mendukung field negative prompt terpisah, larangan ini TETAP harus
tersirat lewat kalimat ai_ready_prompt itu sendiri — JANGAN tambah field baru ke skema JSON.
Jaga larangan ini SINGKAT (beberapa kata saja) karena ai_ready_prompt punya batas karakter ketat.`;

// Dipakai khusus scene yang punya reference_image berperan environment (fasad/ruangan/properti) —
// dipanggil dari masterPrompt.ts (generate awal), sceneRegen.ts (regenerate per-scene), dan
// autoRephrase.ts (rewrite policy). JANGAN copy-paste teks ini.
export const CAMERA_REF_RULE = `[ATURAN KAMERA — SCENE BER-REFERENSI LOKASI/ENVIRONMENT]
Scene yang punya reference_image environment (fasad, ruangan, properti) DILARANG memakai whip-pan
atau fast reveal sebagai pergerakan kamera utama dalam scene tersebut — gerakan kamera cepat memicu
AI video tool menghalusinasi ulang struktur bangunan sehingga tidak match foto referensi. WAJIB pakai
slow push-in, gentle orbit, atau steady gimbal untuk camera_direction scene ini. Whip-pan tetap boleh
dipakai khusus di field transition_to_next menuju scene berikutnya, bukan sebagai gerakan utama scene
itu sendiri.`;

// Aturan pengucapan angka dalam narasi — TEMUAN LAPANGAN: "empat koma lima miliar" adalah bentuk
// tulisan, belibet diucapkan; bentuk lisan natural = "empat setengah miliar". Dipanggil dari
// masterPrompt.ts (generate awal), sceneRegen.ts (regenerate per-scene), dan autoRephrase.ts
// (rewrite policy). JANGAN copy-paste teks ini.
export const SPOKEN_NUMBER_RULE = `ANGKA DALAM NARASI WAJIB bentuk ucapan paling natural: "empat setengah miliar" BUKAN "empat koma
lima miliar"; "dua ratus lima puluh lima meter" BUKAN "dua lima lima meter"; HINDARI kata "koma"
dalam menyebut angka kecuali benar-benar tak terhindarkan; harga dibulatkan ke bentuk lisan (mis.
"sembilan ratus ribuan" untuk Rp 949.000 kalau konteksnya santai).`;

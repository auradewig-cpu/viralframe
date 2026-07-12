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

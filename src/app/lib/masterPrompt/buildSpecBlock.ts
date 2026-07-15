import { CompileContext } from './context';
import { SPOKEN_NUMBER_RULE, CAMERA_REF_RULE } from '../negativePrompt';
import { EXPRESSIONS, VISUAL_STYLES, BACKSOUNDS, NARRATIVE_TONES } from '../maps';
import { getLipsyncSpec } from '../lipsync';

export function buildSpecBlock(ctx: CompileContext): string {
  const { form, contentGoalBlock, effectiveStyle, durations, characterBlock, isFacelessPov, characterAnchor, hasLocation, validLocationRefs, sceneLocationRefTable, hasEnvironmentRef, characterBindingSentence, characterLocationInstruction, characterRefInstruction, narrationWPM } = ctx;
  return `

[BLOK 3: SPESIFIKASI VIDEO]

AI TOOL: ${form.aiTool} | RASIO: ${form.ratio} | TOTAL SCENE: ${form.sceneCount}
${contentGoalBlock}
GAYA KONTEN: ${effectiveStyle.label} — ${effectiveStyle.description}
STRUKTUR: ${effectiveStyle.structureDescription}
GAYA BAHASA NARASI UNTUK GAYA KONTEN INI: ${effectiveStyle.narrativeVoiceGuidance}
INTENSITAS CTA: ${effectiveStyle.ctaIntensity === 'hard' ? 'CTA WAJIB keras dan eksplisit di scene terakhir (ajakan bertindak jelas).' : effectiveStyle.ctaIntensity === 'soft' ? 'CTA HARUS lembut/tersirat (misal ajakan follow untuk konten berikutnya), BUKAN hard-selling.' : 'JANGAN ada CTA komersial sama sekali — akhiri secara natural sesuai gaya konten.'}
PERAN TIAP SCENE: ${durations.map((_, i) => `Scene ${i + 1} = ${effectiveStyle.getSceneRole(i, form.sceneCount, form)}`).join(' · ')}
    HOOK TYPE: ${form.hookType === 'auto' ? 'AI bebas memilih teknik hook paling kuat sesuai niche & target audience.' : `WAJIB gunakan teknik hook "${form.hookType}" di Scene 1 — bangun SELURUH narasi & visual scene pembuka di sekitar teknik ini secara eksplisit, bukan cuma disinggung sekilas.`}
    HOOK PACING (WAJIB, berlaku APAPUN total durasi Scene 1): Meskipun Scene 1 berdurasi ${durations[0]} detik penuh, inti hook (kejutan/klaim/pertanyaan/pain point) WAJIB tersampaikan TUNTAS dalam ${Math.min(5, durations[0])} DETIK PERTAMA narasi — sekitar ${getLipsyncSpec(Math.min(5, durations[0]), narrationWPM).maxWords} kata pertama dari script_narration. HOOK FRONT-LOADED: KALIMAT PERTAMA script_narration (bukan kalimat kedua/ketiga) HARUS langsung berisi inti hook — DILARANG membuka dengan basa-basi/sapaan ("Hari ini aku main ke...") lalu menaruh hook di kalimat berikutnya.${form.contentStyle === 'property_tour' ? ' KHUSUS PROPERTY TOUR (WAJIB KERAS): kalimat pertama harus berupa angka mengejutkan / pertanyaan / klaim menarik tentang properti (harga, lokasi, keunikan) — sapaan/konteks/teaser isi rumah baru boleh menyusul SETELAH hook tersampaikan.' : ''} JANGAN menunda inti hook sampai pertengahan/akhir scene. Sisa durasi (${Math.max(0, durations[0] - Math.min(5, durations[0]))} detik terakhir, jika ada) boleh dipakai untuk transisi natural, elaborasi singkat, atau jembatan ke scene berikutnya — TAPI dampak/kejutan utama harus SUDAH tersampaikan di awal, bukan di bagian ini.
CTA TYPE: ${form.ctaType === 'auto' ? 'AI bebas memilih jenis CTA paling kuat sesuai niche & platform.' : `WAJIB gunakan jenis CTA "${form.ctaType}" di scene terakhir — bangun SELURUH narasi & visual scene penutup di sekitar CTA ini secara eksplisit.`}
${form.ctaType === 'comment_keyword' && form.ctaKeyword ? `CTA Keyword WAJIB dipakai persis: "${form.ctaKeyword}" — sertakan kata ini secara eksplisit di script_narration atau text_overlay scene CTA.` : ''}

LIPSYNC PER SCENE:
${durations.map((d, i) => {
  const spec = getLipsyncSpec(d, narrationWPM);
  const type = effectiveStyle.getSceneRole(i, form.sceneCount, form);
  return `Scene ${i + 1} [${type}]: ${d}s → maks ${spec.maxWords} kata (${spec.pace}) — ${spec.instruction}`;
}).join('\n')}

GAYA BICARA & ARTIKULASI (WAJIB dipatuhi untuk SEMUA script_narration):
Tulis narasi seolah diucapkan oleh presenter/talent yang SUPEL, PERCAYA DIRI, dengan intonasi CEPAT namun ARTIKULASI JELAS — gaya konten kreator TikTok/Reels yang lancar bicara, bukan gaya formal/lambat/berbelit. Panduan menulis:
- Gunakan kalimat PENDEK dan LANGSUNG (subjek-predikat-objek sederhana), hindari anak kalimat bertumpuk.
- Gunakan kata-kata SEHARI-HARI yang familiar diucapkan cepat (contoh: "banget", "gampang", "gak ribet"), HINDARI kata formal/panjang yang sulit diucapkan cepat (contoh hindari: "signifikan", "komprehensif", "infrastruktur").
- HINDARI gugus konsonan sulit berturut-turut dalam satu frasa pendek.
- TARGET JUMLAH KATA: setiap script_narration WAJIB mendekati max_words yang tertera di tabel LIPSYNC PER SCENE di atas — target MINIMAL 85% dari max_words (bukan asal jauh di bawahnya).${form.hookType === 'visual_shock' ? ' PENGECUALIAN: Scene 1 memakai hook Visual Shock (tanpa narasi) — script_narration Scene 1 boleh kosong atau sangat pendek (0–5 kata), dampak hook sepenuhnya dari visual + sound design.' : ''} Kalimat yang terlalu pendek dibanding durasi scene membuat pacing terasa aneh (talent harus memperlambat ucapan tidak natural, atau ada jeda kosong). JANGAN melebihi max_words, tapi JUGA JANGAN terlalu jauh di bawahnya — isi ruang bicara yang tersedia dengan konten yang relevan (detail produk tambahan, penekanan USP, transisi kalimat) alih-alih memotong terlalu pendek.
- Sebelum submit, HITUNG jumlah kata script_narration dan pastikan berada di rentang 85%–100% dari max_words scene tersebut.
- ${SPOKEN_NUMBER_RULE}

KARAKTER:
${characterBlock}
${isFacelessPov ? 'MODE POV FACELESS: character_expression WAJIB diisi dengan deskripsi GESTUR TANGAN (bukan ekspresi wajah) — misal "jari menunjuk detail produk dengan percaya diri", "tangan membuka kemasan perlahan". JANGAN sebutkan ekspresi wajah/mata/senyum apapun, karena wajah TIDAK PERNAH tampil di mode ini.' : (form.useCharacter ? (form.expression === 'auto' ? 'Ekspresi karakter: AI bebas menentukan ekspresi paling sesuai tiap scene.' : `Ekspresi karakter WAJIB: "${EXPRESSIONS.find(e => e.value === form.expression)?.label || form.expression}" sebagai ekspresi DASAR karakter di semua scene (boleh sedikit bervariasi sesuai konteks emosi scene, tapi harus tetap terasa sebagai ekspresi dasar yang sama). PENTING: Tulis deskripsi ekspresi ini dalam kalimat natural di field character_expression (JSON output), JANGAN tulis ulang slug/kode teknis apapun.`) : '')}
${isFacelessPov ? `\nCHARACTER ANCHOR STRING SUMBER (bahan mentah, mungkin bercampur Bahasa Indonesia dari input user — BUKAN yang dikunci verbatim):\n'${characterAnchor}'\n\nWAJIB TERJEMAHKAN string di atas ke English presisi dan tidak ambigu SEBELUM dipakai sebagai character_sheet.description — terjemahkan SEMUA istilah visual Indonesia (deskripsi tangan/aksesori) ke istilah English yang jelas, contoh: "kuku dicat merah" → "red-painted nails", "gelang emas" → "gold bracelet". Hasil terjemahan English inilah yang WAJIB di-copy verbatim kata-per-kata ke awal SETIAP ai_ready_prompt di semua scene — identik persis, tanpa variasi antar scene. Tanpa hand anchor yang identik di setiap prompt, AI video tool akan menghasilkan tangan/aksesori berbeda di setiap scene.\n\nCAMERA DIRECTION WAJIB (POV FIRST-PERSON): Kamera = sudut pandang mata talent sendiri (first-person POV). Tangan talent masuk frame DARI BAWAH/DEPAN layar seolah penonton yang sedang memegang & mereview produk. camera_direction WAJIB eksplisit menyebutkan "first-person POV, hand entering frame from bottom" di setiap scene.\n\nLARANGAN EKSPLISIT (WAJIB dipatuhi SETIAP scene, di visual_description, camera_direction, DAN ai_ready_prompt): "no face visible, no reflection showing face". TIDAK BOLEH ada wajah, cermin/pantulan yang menampilkan wajah, atau bagian tubuh selain tangan/lengan yang teridentifikasi sebagai orang.` : (form.useCharacter ? `\nCHARACTER ANCHOR STRING SUMBER (bahan mentah, mungkin bercampur Bahasa Indonesia dari input user seperti Ciri Fisik Khusus — BUKAN yang dikunci verbatim):\n'${characterAnchor}'\n\nWAJIB TERJEMAHKAN string di atas ke English presisi dan TIDAK AMBIGU SEBELUM dipakai sebagai character_sheet.description. Terjemahkan SEMUA istilah visual Indonesia ke istilah English yang tidak ambigu, JANGAN terjemahkan harfiah kalau istilahnya ambigu. Contoh WAJIB diikuti:
- "kemeja" → "button-up collared shirt" (BUKAN "shirt" saja, BUKAN "t-shirt")
- "kaos" → "t-shirt"
- rambut "sebahu" → "shoulder-length hair"
- "jilbab" → "hijab"
- "hijab" → "headscarf/hijab"
- "training" / "olahraga" → "athletic wear / sportswear"
Hasil terjemahan English inilah yang WAJIB di-copy verbatim kata-per-kata ke awal SETIAP ai_ready_prompt di semua scene — identik persis, tanpa variasi antar scene. Tanpa character anchor yang identik di setiap prompt, AI video tool akan menghasilkan karakter berbeda di setiap scene.` : '')}
${characterRefInstruction}
${hasLocation ? `\nLOKASI YANG HARUS DIGUNAKAN: ${form.locationDescription}. Semua scene HARUS menampilkan lokasi/properti yang SAMA dari sudut pandang berbeda.` : ''}
${validLocationRefs.length > 0 ? `\nREFERENSI LOKASI/PRODUK PER SCENE (Multi-Reference Image, WAJIB DIPATUHI PERSIS — reference_image BOLEH BERBEDA antar scene, ikuti tabel ini per scene, JANGAN disalin rata dari satu scene ke scene lain):\n${sceneLocationRefTable}` : ''}
${hasEnvironmentRef ? `\n${CAMERA_REF_RULE}` : ''}
${form.contentStyle === 'property_tour' ? `\nPROPERTY TOUR — SINKRONISASI URUTAN TUR: Urutan scene tur ruangan (Scene 2 s.d. Scene ${Math.max(2, form.sceneCount - 1)}) WAJIB mengikuti penugasan REFERENSI LOKASI/PRODUK PER SCENE di atas persis — 1 scene = 1 ruangan sesuai locationRefs, JANGAN acak urutannya. Tiap narasi ruangan WAJIB menyebut MINIMAL 1 fakta konkret dari PRODUK/LAYANAN atau keterangan foto di atas (luas, jumlah kamar, material) — bukan pujian kosong ("bagus banget", "keren abis") tanpa fakta. transition_to_next antar ruangan WAJIB bergaya walk-through berkelanjutan (whip-pan / walk-and-talk melewati pintu/lorong) supaya terasa satu kunjungan utuh, BUKAN cut terpisah-pisah.` : ''}

GAYA VISUAL: ${form.visualStyle === 'auto' ? 'AI bebas menentukan gaya visual paling sesuai niche & platform.' : `WAJIB gunakan gaya visual "${VISUAL_STYLES.find(v => v.value === form.visualStyle)?.label || form.visualStyle}" di SETIAP scene tanpa kecuali — cerminkan gaya ini secara eksplisit dalam kalimat natural di visual_description, camera_direction, dan field "visual_style" pada global_style. JANGAN tulis ulang slug/kode teknis apapun ke output JSON.`}
BACKSOUND: ${form.backsound === 'auto' ? 'AI bebas menentukan backsound/musik paling sesuai mood video.' : `WAJIB gunakan backsound/musik bergaya "${BACKSOUNDS.find(b => b.value === form.backsound)?.label || form.backsound}" — cerminkan dalam kalimat natural di field "music_direction" dan "sfx_palette" pada global_style. JANGAN tulis ulang slug/kode teknis apapun ke output JSON.`}
TONE: ${form.narrativeTone === 'auto' ? 'AI bebas menentukan tone narasi paling sesuai niche & audience.' : `WAJIB gunakan tone narasi "${NARRATIVE_TONES.find(t => t.value === form.narrativeTone)?.label || form.narrativeTone}" secara konsisten di SEMUA script_narration dan field "overall_emotional_arc" pada global_style — bukan cuma di salah satu scene. JANGAN tulis ulang slug/kode teknis apapun ke output JSON.`}`;
}

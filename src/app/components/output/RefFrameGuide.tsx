import { AI_TOOLS } from '../../lib/maps';

export function RefFrameGuide({ aiTool, sceneNumber, isFirst }: { aiTool: string; sceneNumber: number; isFirst: boolean }) {
  const tool = AI_TOOLS.find(t => t.value === aiTool);
  const toolName = tool?.label || aiTool;
  const supportsRef = tool?.supportsRef || false;

  if (isFirst) {
    return (
      <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
        <p>Scene pertama — tidak perlu referensi dari scene sebelumnya.</p>
        <p className="mt-1">Setelah generate Scene 1: simpan frame terbaik sebagai referensi untuk Scene 2.</p>
        {!supportsRef && <p className="mt-2 text-xs" style={{ color: 'var(--vf-text-muted)' }}>Tool: {toolName} tidak mendukung reference image. Konsistensi dijaga melalui deskripsi karakter identik di setiap prompt.</p>}
      </div>
    );
  }

  const prev = sceneNumber - 1;
  if (!supportsRef) {
    return (
      <div className="p-3 rounded-lg text-sm space-y-1" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
        <p><strong>{toolName}</strong> tidak mendukung reference image.</p>
        <p>Konsistensi dijaga melalui deskripsi teks yang identik. Prompt setiap scene sudah menyertakan deskripsi karakter lengkap dan identik. Generate semua scene dengan prompt yang disediakan.</p>
      </div>
    );
  }

  const steps: Record<string, string[]> = {
    kling_ai: [`Generate Scene ${prev} terlebih dahulu`, 'Pilih frame terbaik → klik "..." → "Save Frame"', 'Di halaman baru: klik "Image to Video"', `Upload frame Scene ${prev} sebagai "Start Frame"`, `Paste prompt Scene ${sceneNumber} di kolom teks`, 'Klik Generate'],
    runway_gen4: [`Generate Scene ${prev}, download hasilnya`, 'Di Runway: pilih "Gen-4" → klik "Reference Image"', `Upload frame dari Scene ${prev}`, `Paste prompt Scene ${sceneNumber} di kolom teks`, 'Generate'],
    luma_dream: [`Generate Scene ${prev}, ambil frame terakhirnya`, 'Di Luma: klik "Keyframe" atau "Image to Video"', `Upload frame Scene ${prev} sebagai "Start Frame"`, `Paste prompt Scene ${sceneNumber}`, 'Generate'],
    minimax_hailuo: [`Generate Scene ${prev}, simpan frame terakhir`, 'Di Minimax: pilih "Subject Reference" atau "Image to Video"', 'Upload frame sebagai referensi', `Paste prompt Scene ${sceneNumber}`, 'Generate'],
    pika_labs: [`Generate Scene ${prev}, download frame terbaik`, 'Di Pika: klik "+" → "Upload Image"', `Upload frame Scene ${prev}`, `Paste prompt Scene ${sceneNumber} di kolom teks`, 'Generate'],
    bytedance_jianying: [`Generate Scene ${prev} di Jianying, simpan frame`, 'Pilih "AI Video" → "Image/Video to Video"', `Upload frame Scene ${prev}`, `Masukkan prompt Scene ${sceneNumber}`, 'Generate'],
    wan21: [`Generate Scene ${prev}, simpan frame terbaik`, 'Di Wan: pilih mode "Image to Video"', `Upload frame Scene ${prev}`, `Paste prompt Scene ${sceneNumber}`, 'Generate'],
  };

  const guideSteps = steps[aiTool] || [`Upload frame Scene ${prev} sebagai referensi di ${toolName}`, `Paste prompt Scene ${sceneNumber}`, 'Generate'];

  return (
    <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--vf-bg-secondary)', color: 'var(--vf-text-secondary)' }}>
      <p className="font-medium mb-2" style={{ color: 'var(--vf-text-primary)' }}>Tool: {toolName}</p>
      <ol className="space-y-1">
        {guideSteps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--vf-accent-primary)', color: 'white' }}>{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

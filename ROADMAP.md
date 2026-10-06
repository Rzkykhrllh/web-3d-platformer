# Roadmap: dari POC ke game yang terasa profesional

Urutannya sengaja: fondasi dulu, baru aset. Aset bagus di atas fondasi yang masih hardcode bakal dikerjain dua kali.

Label: **[P1]** wajib untuk kesan "game beneran", **[P2]** nambah kualitas jelas, **[P3]** nice to have.

---

## 0. Keputusan awal (sebelum ngoding lagi)

- [ ] **[P1]** Tentukan art direction. Pilihannya:
  - Stylized "toon" ala Crash N. Sane: warna jenuh, tekstur hand-painted, outline tipis
  - Stylized PBR ala game indie modern: material realistis tapi bentuknya kartun
  - Bikin 1 moodboard (5–10 screenshot referensi) dan jadikan patokan semua aset
- [ ] **[P1]** Tentukan sumber aset: bikin sendiri di Blender, beli/pakai pack CC0, atau commission karakter utama
- [ ] **[P2]** Tentukan nasib tema Crash (nama, karakter) sebelum bikin karakter final

## 1. Fondasi teknis

- [ ] **[P1]** Level dibangun dari file `.glb` hasil Blender, bukan koordinat di `level.js`
  - Collider, spawn peti, buah, checkpoint ditandai lewat nama object / custom property di Blender
- [ ] **[P1]** Loader aset + loading screen dengan progress bar
- [ ] **[P1]** Kompresi aset: Draco/Meshopt untuk mesh, KTX2 untuk tekstur
- [ ] **[P1]** Collision yang proper: Rapier (physics engine WASM) atau capsule-vs-mesh sendiri. Sekarang masih kotak AABB.
- [ ] **[P2]** State machine untuk player (idle, run, jump, fall, spin, hurt, dead, victory)
- [ ] **[P2]** Pindah ke TypeScript sebelum kodenya membesar
- [ ] **[P2]** Quality tier otomatis (low/medium/high) berdasarkan device dan FPS
- [ ] **[P3]** Debug panel (lil-gui): tweak kecepatan, gravitasi, lighting secara live

## 2. Game feel (paling murah, efeknya paling kerasa)

- [ ] **[P1]** Akselerasi dan deselerasi, bukan langsung kecepatan penuh
- [ ] **[P1]** Coyote time (masih bisa lompat sesaat setelah lewat tepi) dan jump buffer
- [ ] **[P1]** Tinggi lompat variabel (tahan Space = lebih tinggi)
- [ ] **[P1]** Bayangan bulat di bawah karakter saat di udara, supaya pendaratan gampang dibaca
- [ ] **[P1]** Kamera: look-ahead ke arah lari, lebih smooth saat naik turun, nggak nembus tembok
- [ ] **[P2]** Hit-stop singkat waktu peti pecah, squash and stretch saat mendarat
- [ ] **[P2]** Partikel: debu saat lari/mendarat, serpihan kayu, percikan buah, ledakan TNT yang proper
- [ ] **[P2]** Getar di HP (Vibration API) untuk ledakan dan pendaratan

## 3. Visual dan rendering

- [ ] **[P1]** Post-processing: tone mapping ACES/AgX, bloom halus, color grading (LUT)
- [ ] **[P1]** Skybox atau HDRI + environment map supaya material punya pantulan
- [ ] **[P1]** Lighting baked (lightmap dari Blender) untuk level statis, real-time cuma untuk yang bergerak
- [ ] **[P1]** Shader air: gelombang, busa di tepi, transparansi
- [ ] **[P2]** Vegetasi pakai instancing + shader angin, jumlahnya bisa ratusan tanpa drop FPS
- [ ] **[P2]** Ambient occlusion (SSAO/N8AO) dan fog berlapis untuk kedalaman
- [ ] **[P2]** Outline atau rim light di karakter supaya selalu menonjol dari background
- [ ] **[P3]** Day/night atau variasi suasana per section (pantai siang, hutan teduh, reruntuhan sore)

## 4. Aset

- [ ] **[P1]** Karakter utama: model rigged + animasi idle, run, jump, fall, land, spin, hurt, victory
  - Mixamo cuma cocok untuk humanoid; karakter hewan perlu animasi buatan atau commission
- [ ] **[P1]** Peti versi final: biasa, "?", TNT, plus varian baru (lihat bagian 5)
- [ ] **[P1]** Modular kit lingkungan: potongan jalur, tebing, batu, akar, jembatan kayu, reruntuhan
- [ ] **[P2]** Vegetasi: 3–4 jenis palem, semak, pakis, bunga, rumput
- [ ] **[P2]** Props: totem, obor, tanda kayu, tong, tali
- [ ] **[P2]** Tekstur CC0 dari Poly Haven / ambientCG; model CC0 dari Kenney, Quaternius, Poly Pizza sebagai pengisi
- [ ] **[P3]** Logo dan judul game buatan sendiri

## 5. Level design

- [ ] **[P1]** Jalur melengkung (spline), bukan garis lurus, dengan kamera yang ikut belokan
- [ ] **[P1]** 3–4 section dengan ritme jelas: intro (aman), tantangan, jeda, klimaks
- [ ] **[P1]** Rintangan bergerak: platform naik turun, platform yang runtuh, kayu berputar
- [ ] **[P2]** Musuh sederhana: kepiting yang mondar-mandir, tanaman yang menggigit (bisa di-spin)
- [ ] **[P2]** Varian peti: peti pantul, peti besi (nggak bisa dipecah), peti checkpoint, peti "!" yang memunculkan jembatan
- [ ] **[P2]** Segmen kejar-kejaran: batu besar menggelinding ke arah kamera, lari menghadap kamera
- [ ] **[P2]** Area rahasia + hadiah kalau semua peti pecah (gem bonus)
- [ ] **[P3]** Sistem nyawa dan "game over" yang ringan (atau sengaja nggak ada, demi recruiter)

## 6. Audio

- [ ] **[P1]** SFX: langkah, lompat, mendarat, peti pecah, buah, spin, TNT berdetak, ledakan, gem
- [ ] **[P1]** Musik latar tropis yang loop, dengan tombol mute yang jelas
- [ ] **[P2]** Audio diputar setelah interaksi pertama (aturan autoplay browser), volume terpisah musik/SFX
- [ ] **[P3]** Suara posisional (TNT di kiri terdengar dari kiri)

## 7. UI dan presentasi

- [ ] **[P1]** Main menu dengan kamera sinematik, bukan papan kayu statis
- [ ] **[P1]** Kartu konten yang lebih kaya: gambar/screenshot project, link ke detail
- [ ] **[P2]** Halaman detail project (bisa di luar game, HTML biasa)
- [ ] **[P2]** Pause menu: lanjut, restart, pengaturan (audio, kualitas grafis), kontrol
- [ ] **[P2]** Layar finish dengan stats dan rank (misal waktu + persentase peti)
- [ ] **[P3]** Transisi antar layar (fade, iris wipe ala game klasik)

## 8. Konten portfolio

- [ ] **[P1]** Ganti semua placeholder di `src/content.js` dengan isi asli
- [ ] **[P1]** Screenshot/diagram untuk tiap project (tanpa info rahasia kantor)
- [ ] **[P2]** CV yang bisa diunduh di layar finish dan di "See everything"

## 9. Rilis

- [ ] **[P1]** Deploy (Vercel, Netlify, atau GitHub Pages) + domain sendiri
- [ ] **[P1]** Versi non-game yang ramah SEO dan screen reader (HTML biasa berisi konten yang sama)
- [ ] **[P1]** Uji di HP kelas menengah: target 60 FPS di desktop, 30+ di HP
- [ ] **[P2]** Open Graph image dan meta tag supaya link-nya bagus saat dibagikan
- [ ] **[P2]** Analytics ringan (Plausible / Umami): berapa yang main vs langsung "See everything"
- [ ] **[P3]** Leaderboard waktu tercepat

---

## Urutan kerja yang disarankan

1. Bagian 0 (keputusan) + bagian 2 (game feel). Murah, langsung kerasa, nggak bergantung aset.
2. Bagian 1 (pipeline Blender → glb). Setelah ini level bisa didesain di Blender.
3. Satu section level dibikin "vertical slice": aset final, lighting, audio, efek. Jadikan patokan kualitas.
4. Duplikasi kualitas itu ke section lain, lalu bagian 7–9.

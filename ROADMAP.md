# Roadmap: dari POC ke game yang terasa profesional

Label: **[P1]** wajib untuk kesan "game beneran", **[P2]** nambah kualitas jelas, **[P3]** nice to have.
Tanda 👤 = butuh keputusan, aset, atau akun dari kamu.

---

## 0. Keputusan awal

- [x] **[P1]** Art direction: stylized/cartoon seperti versi sekarang (warna jenuh, bentuk bulat, outline). Bukan realistis: lebih ringan dan lebih cocok dengan tema
- [ ] 👤 **[P1]** Sumber aset: bikin sendiri di Blender, pack CC0, atau commission karakter utama
- [ ] 👤 **[P2]** Tema Crash (nama, karakter) atau original

## 1. Fondasi teknis

- [x] **[P1]** Level bisa dibangun di Blender → `.glb` (konvensi nama ada di README, contoh: `scripts/make-sample-level.mjs`)
- [x] **[P1]** Loading screen dengan progress bar
- [x] **[P1]** Dukungan kompresi mesh (Draco, Meshopt) di loader level
- [ ] **[P2]** Tekstur KTX2 (baru perlu setelah ada tekstur asli)
- [ ] **[P2]** Collision mesh (Rapier / BVH). Sekarang kotak AABB; cukup untuk level kotak-kotak, kurang untuk medan miring
- [x] **[P2]** State machine player (idle, run, jump, fall, hurt + spin)
- [ ] **[P2]** Pindah ke TypeScript (sengaja ditunda sampai struktur stabil)
- [x] **[P2]** Quality tier otomatis (low/medium/high) + turun sendiri kalau FPS rendah. Desktop mulai di medium
- [x] **[P3]** Debug panel (`?debug`): tuning gerak, kamera, lighting, teleport

## 2. Game feel

- [x] **[P1]** Akselerasi dan deselerasi
- [x] **[P1]** Coyote time dan jump buffer
- [x] **[P1]** Tinggi lompat variabel
- [x] **[P1]** Bayangan bulat di bawah karakter
- [x] **[P1]** Kamera: tinggi ikut tanah (bukan tiap lompatan), look-ahead, shake
- [x] **[P2]** Hit-stop, squash and stretch
- [x] **[P2]** Partikel: debu lari/mendarat, serpihan, kilau buah, ledakan, bintang musuh, jejak spin
- [x] **[P2]** Getar di HP

## 3. Visual dan rendering

- [x] **[P1]** Toon shading (`src/render/toon.js`): semua material pakai `MeshToonMaterial` 3 band, tanpa normal map / env map
- [x] **[P1]** Post-processing (bloom, color grade + vignette), hanya di quality high
- [x] **[P1]** Langit gradien
- [ ] 👤 **[P1]** Lighting baked (lightmap dari Blender), setelah level dibuat di Blender
- [x] **[P1]** Shader air dengan gelombang
- [x] **[P2]** Rumput, semak, palem instanced + shader angin
- [x] **[P2]** Outline di karakter dan peti
- [ ] **[P3]** Variasi suasana per section (pagi, teduh, sore)

## 4. Aset (sekarang semua placeholder buatan kode)

- [ ] 👤 **[P1]** Karakter utama: model rigged + animasi idle, run, jump, fall, land, spin, hurt, victory
- [ ] 👤 **[P1]** Peti final (sekarang tekstur canvas)
- [ ] 👤 **[P1]** Modular kit lingkungan: jalur, tebing, batu, akar, jembatan, reruntuhan
- [ ] 👤 **[P2]** Vegetasi final (sekarang palem dan semak prosedural)
- [ ] 👤 **[P2]** Props: totem, obor, tanda kayu, tong, tali
- [ ] 👤 **[P2]** Tekstur stylized/hand-painted menggantikan tekstur noise di `src/render/textures.js` (hindari tekstur foto-realistis)
- [ ] 👤 **[P3]** Logo dan judul game

## 5. Level design

- [ ] 👤 **[P1]** Desain level final bareng kamu (sekarang 7 section di `src/level.js`)
- [ ] **[P1]** Jalur melengkung (spline) + kamera ikut belokan
- [x] **[P1]** Section dengan ritme: intro, jurang, hutan, reruntuhan, jurang 2, finish
- [x] **[P1]** Platform bergerak dan platform runtuh
- [x] **[P2]** Musuh: kepiting (injak atau spin)
- [x] **[P2]** Varian peti: pantul, besi, checkpoint, "!" + peti hantu
- [ ] **[P2]** Segmen kejar-kejaran batu menggelinding
- [x] **[P2]** Seksi Fire Temple: kayu menggelinding, semburan api berirama, peti Nitro, lift vertikal ke puncak kuil
- [x] **[P2]** Power crystal pink di tengah level + gem hijau yang baru terbuka setelah semua peti pecah, warp pad sebagai finish
- [ ] **[P2]** Area rahasia
- [ ] **[P3]** Sistem nyawa (sengaja belum, demi recruiter)

## 6. Audio

- [x] **[P1]** SFX lengkap (sintesis, placeholder sampai ada rekaman)
- [x] **[P1]** Musik latar loop (generated) + tombol mute
- [ ] 👤 **[P1]** Musik dan SFX asli (set `AUDIO.musicUrl` di `src/config.js`)
- [x] **[P2]** Audio mulai setelah interaksi pertama, volume musik/SFX terpisah
- [x] **[P3]** Stereo pan untuk peti dan ledakan

## 7. UI dan presentasi

- [x] **[P1]** Main menu di atas fly-through level
- [ ] 👤 **[P1]** Kartu konten dengan gambar/screenshot project
- [ ] **[P2]** Halaman detail per project
- [x] **[P2]** Pause menu + settings (musik, SFX, grafis, screen shake), disimpan di browser
- [x] **[P2]** Layar finish: waktu, buah, peti, konten, medali
- [ ] **[P3]** Transisi antar layar ala game klasik

## 8. Konten portfolio

- [x] 👤 **[P1]** Ganti placeholder di `src/content.js` dengan isi asli (dari dev.byairu.com)
- [ ] 👤 **[P1]** Screenshot/diagram tiap project (tanpa info rahasia kantor)
- [ ] 👤 **[P2]** CV yang bisa diunduh

## 9. Rilis

- [x] 👤 **[P1]** Deploy (Dokploy, lihat `Dockerfile`)
- [x] **[P1]** Versi non-game: `/portfolio.html` + isi `<noscript>`, dibuat otomatis saat build
- [ ] 👤 **[P1]** Uji di HP kelas menengah (target 30+ FPS)
- [ ] **[P2]** Gambar Open Graph (`public/og-image.png`, 1200×630) setelah visual final; meta tag lain sudah ada
- [ ] 👤 **[P2]** Analytics ringan (Plausible / Umami)
- [ ] **[P3]** Leaderboard waktu tercepat

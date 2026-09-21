export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  author: string;
  authorRole: string;
  category: string;
  content: string; // rich markdown/html content
  relatedSlugs: string[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'cara-mencari-teman-di-semarang',
    title: 'Cara Mencari Teman Baru di Semarang sebagai Mahasiswa',
    excerpt: 'Panduan lengkap bagi mahasiswa perantau maupun lokal untuk membangun jejaring pertemanan sehat di Semarang tanpa canggung.',
    date: '2026-09-15',
    readTime: '6 menit baca',
    author: 'Tim Editorial NIVA',
    authorRole: 'Student Community Research',
    category: 'Student Life',
    relatedSlugs: ['tips-berkenalan-di-kampus', 'kenapa-verifikasi-mahasiswa-penting'],
    content: `
### Memulai Kehidupan Kampus di Kota Atlas

Bagi ribuan mahasiswa baru yang datang ke Semarang setiap tahunnya—baik yang berkuliah di Tembalang (UNDIP, POLINES), Gunungpati (UNNES), Ngaliyan (UIN Walisongo), maupun area perkotaan (UDINUS, UNISSULA, SCU, UPGRIS)—memulai lingkaran pertemanan baru sering kali menjadi tantangan pertama yang cukup mendebarkan.

Semarang adalah kota yang ramah dan kental dengan atmosfer akademik, namun dinamika antar-kampus yang tersebar secara geografis bisa membuat seseorang merasa terisolasi dalam lingkup jurusannya saja.

---

### 1. Manfaatkan Titik Kumpul Kreatif dan Kafe Produktif

Semarang memiliki ekosistem kafe dan ruang publik yang sangat bersahabat bagi mahasiswa. Titik-titik seperti area Pleburan, Tembalang, Kota Lama, dan Siranda sering menjadi ruang temu informal di mana mahasiswa dari berbagai kampus saling berinteraksi.

* **Tip:** Saat mengerjakan tugas di kafe produktif, jangan ragu untuk membuka percakapan santai, misalnya menanyakan ketersediaan colokan listrik atau rekomendasi menu. Sikap ramah adalah kunci keterbukaan awal.

---

### 2. Bergabung dengan Komunitas Minat Lintas Kampus

Lingkaran kampus internal memang penting, namun komunitas berbasis hobi membuka pintu ke perspektif yang lebih luas. Di Semarang, ada berbagai komunitas fotografi, pegiat lingkungan, klub lari pagi Simpang Lima, hingga kelompok pegiat buku di perpustakaan kota.

Ketika Anda bertemu orang lain dengan dasar minat yang sama, rasa canggung akan hilang secara alami karena sudah ada bahan obrolan yang otentik.

---

### 3. Gunakan Platform Digital yang Terverifikasi dan Aman

Keterbatasan mobilitas dan kesibukan jadwal kuliah sering kali membuat mahasiswa beralih ke platform digital. Namun, kekhawatiran terbesar dalam mencari teman online adalah profil palsu (*catfishing*) dan risiko privasi.

Inilah mengapa platform seperti **NIVA** menghadirkan verifikasi mahasiswa khusus Semarang. Dengan memastikan bahwa orang yang Anda temui benar-benar berstatus mahasiswa aktif, interaksi digital terasa jauh lebih aman dan bermakna.

---

### Ringkasan Praktis:
* Mulai dengan menyapa teman satu asrama/kos atau organisasi fakultas.
* Kunjungi kegiatan seni, workshop, dan seminar publik di Semarang.
* Prioritaskan keamanan dan kejelasan identitas saat berkenalan secara daring.
    `,
  },
  {
    slug: 'tips-berkenalan-di-kampus',
    title: 'Tips Berkenalan dengan Mahasiswa dari Kampus Lain',
    excerpt: 'Cara memperluas circle sosial di luar almamater sendiri dengan sopan, santai, dan saling menghargai ruang pribadi.',
    date: '2026-09-12',
    readTime: '5 menit baca',
    author: 'Tim Editorial NIVA',
    authorRole: 'Social Dynamics Columnist',
    category: 'Komunikasi',
    relatedSlugs: ['etika-chat-dengan-orang-baru', 'cara-mencari-teman-di-semarang'],
    content: `
### Mengapa Perlu Berteman Lintas Kampus?

Berada dalam *bubble* kampus yang sama selama 4 tahun sering kali membatasi cara pandang kita. Berteman dengan mahasiswa dari almamater lain—misalnya anak teknik UNDIP berdiskusi dengan mahasiswa DKV UDINUS, atau mahasiswa hukum UNISSULA bertukar pikiran dengan mahasiswa sastra UNNES—memberikan wawasan interdisipliner yang memperkaya wawasan masa muda Anda.

---

### 1. Awali dengan Rasa Ingin Tahu yang Tulus

Hindari membuka percakapan dengan topik yang terlalu formal seperti akreditasi atau kompetisi antar-kampus. Sebaliknya, tanyakan hal-hal yang relevan dan menyenangkan:
* Bagaimana suasana kampus mereka?
* Apa kuliner tersembunyi (*hidden gem*) favorit di sekitar kampus mereka?
* Apa kegiatan ekstra yang sedang mereka tekuni?

---

### 2. Hormati Batasan Privasi

Saat baru pertama kali mengobrol dengan orang dari kampus lain, hargai ruang pribadi mereka. Jangan langsung meminta informasi kontak sensitif seperti nomor WhatsApp pribadi atau alamat kos di 10 menit pertama percakapan.

Gunakan media yang aman—seperti fitur chat terverifikasi di Telegram atau platform perantara—sampai rasa saling percaya terbangun secara wajar.

---

### 3. Jadwalkan Pertemuan di Tempat Publik yang Netral

Jika percakapan online Anda berlanjut ke ajakan bertemu langsung (*meetup* santai):
* Pilihlah kafe yang ramai di titik tengah Semarang (misalnya Simpang Lima, Pleburan, atau Gajahmungkur).
* Beritahu teman sekos ke mana Anda pergi.
* Pastikan masing-masing datang dan pulang secara mandiri.
    `,
  },
  {
    slug: 'keamanan-dating-online',
    title: 'Cara Aman Berkenalan dengan Orang Baru Secara Online',
    excerpt: 'Panduan keselamatan digital bagi mahasiswa: melindungi data pribadi, mendeteksi red flags, dan menjaga batasan sehat.',
    date: '2026-09-10',
    readTime: '7 menit baca',
    author: 'Safety & Trust Team NIVA',
    authorRole: 'Information Security & Community Safety',
    category: 'Keamanan Digital',
    relatedSlugs: ['cara-mengenali-akun-palsu', 'etika-chat-dengan-orang-baru'],
    content: `
### Keamanan adalah Prioritas Utama

Berkenalan secara online membuka peluang koneksi tak terbatas. Namun, kenyamanan hanya bisa tercipta jika standar keselamatan digital dipenuhi sejak awal.

Berikut adalah prinsip keamanan penting yang wajib diterapkan setiap mahasiswa saat berinteraksi di ruang online:

---

### 1. Prinsip Minimalisasi Informasi Pribadi (*Data Privacy*)
Jangan pernah membagikan data identitas sensitif berikut kepada siapa pun yang baru Anda kenal secara online:
* **Nomor Induk Mahasiswa (NIM)**
* **Alamat lengkap kamar kos atau rumah keluarga**
* **Slip tagihan, nomor rekening, atau informasi finansial**
* **Jadwal kuliah harian yang sangat spesifik beserta ruangan kelas**

Platform yang baik (seperti NIVA) menerapkan *privacy-by-design*, di mana data verifikasi seperti NIM tidak pernah ditampilkan ke publik atau ke pengguna lain.

---

### 2. Kenali Sinyal Bahaya (*Red Flags*)
Waspadalah jika teman chat baru Anda menunjukkan tanda-tanda berikut:
* **Meminta uang atau pinjaman:** Dengan alasan mendesak, dompet tertinggal, atau tugas kuliah. Mahasiswa sejati yang menghargai Anda tidak akan meminjam uang dari orang yang baru dikenal secara online.
* **Memaksa meminta foto pribadi:** Menolak menghormati batasan Anda adalah tanda pelanggaran privasi serius.
* **Terburu-buru mengajak berpindah ke aplikasi privat:** Jika seseorang berusaha memindahkan percakapan keluar dari platform berfitur laporan/blokir secepat mungkin, selalu bersikap hati-hati.

---

### 3. Gunakan Fitur Kontrol Akun: Blokir & Laporkan
Jangan ragu untuk menghentikan percakapan jika Anda merasa tidak nyaman. NIVA menyediakan tombol **Lapor** dan **Blokir** instan. Melaporkan perilaku menyimpang membantu menjaga seluruh komunitas kampus tetap aman.
    `,
  },
  {
    slug: 'cara-mengenali-akun-palsu',
    title: 'Cara Mengenali Akun Dating Palsu dan Scam di Lingkungan Kampus',
    excerpt: 'Ciri-ciri akun manipulatif, foto curian, bot promosi, serta alasan verifikasi identitas menjadi benteng utama perlindungan.',
    date: '2026-09-08',
    readTime: '6 menit baca',
    author: 'Safety & Trust Team NIVA',
    authorRole: 'Threat Intelligence & Fraud Prevention',
    category: 'Keamanan Digital',
    relatedSlugs: ['keamanan-dating-online', 'kenapa-verifikasi-mahasiswa-penting'],
    content: `
### Fenomena Catfishing di Kalangan Mahasiswa

Dunia digital memungkinkan siapa saja membuat akun dengan foto menarik yang diunduh dari media sosial orang lain. Di lingkungan kampus, fenomena ini sering digunakan untuk *catfishing*, penipuan tiket konser palsu, hingga pemerasan sosial.

---

### 4 Karakteristik Akun Palsu yang Umum Dijumpai

#### 1. Foto Profil Terlalu Sempurna atau Bergaya Model Luar Negeri
Akun palsu sering kali menggunakan foto selebgram luar negeri atau foto beresolusi rendah hasil tangkapan layar berulang kali. Jika foto terasa seperti katalog komersial dan tidak memiliki nuansa keseharian mahasiswa Indonesia, Anda patut waspada.

#### 2. Menolak Bukti Status Mahasiswa yang Valid
Ketika ditanya mengenai aktivitas kampus, jurusan, atau dosen pembimbing, respons mereka biasanya sangat samar atau mengalihkan topik secara berlebihan.

#### 3. Cerita Terlalu Dramatis dan Mendadak
Scammer sering membangun skenario emosional yang mengundang simpati (misalnya kehilangan dompet, musibah keluarga di luar kota) untuk meminta transfer dana atau pulsa.

#### 4. Bahasa Chat Terkesan Kaku atau Seperti Bot Otomatis
Sering kali pelaku scam menggunakan skrip otomatis yang tidak nyambung dengan pertanyaan konteks lokal di Semarang.

---

### Solusi NIVA: Verifikasi AI & Review Manusia
Untuk mencegah akun tiruan, NIVA menerapkan sistem verifikasi dua lapis:
1. **Analisa AI Vision:** Memeriksa keaslian fisik KTM, mendeteksi manipulasi digital (*photoshop/sample*), dan mencocokkan identitas almamater.
2. **Review Keamanan Terpisah:** Memastikan tidak ada akun ganda atau penggunaan kartu mahasiswa curian.
    `,
  },
  {
    slug: 'etika-chat-dengan-orang-baru',
    title: 'Etika Chat Saat Baru Match: Panduan Percakapan yang Menyenangkan',
    excerpt: 'Cara memulai obrolan pertama tanpa canggung, menghindari pertanyaan klise, dan membangun *chemistry* yang sehat.',
    date: '2026-09-05',
    readTime: '5 menit baca',
    author: 'Tim Editorial NIVA',
    authorRole: 'Relationship Culture Writer',
    category: 'Komunikasi',
    relatedSlugs: ['tips-berkenalan-di-kampus', 'cara-mencari-teman-di-semarang'],
    content: `
### Jangan Mulai dengan Sekadar "P" atau "Halo"

Kesan pertama menentukan arah percakapan. Banyak obrolan di aplikasi sosial berakhir sebelum dimulai hanya karena pesan pembuka yang terlalu singkat, membosankan, atau terkesan malas.

---

### Tips Memulai Obrolan Pertama yang Menarik

#### 1. Perhatikan Profil dan Minat Bersama
Jika match Anda menulis hobi *Ngopi / Cafe Hopping* dan memasang bio tentang skripsi, jadikan itu jembatan:
* *"Hai Nisa! Liat di bio kamu suka nyari spot ngopi aesthetic ya. Udah pernah nyobain kafe di daerah Pleburan belum?"*
Pertanyaan yang merujuk pada profil menunjukkan bahwa Anda benar-benar memperhatikan dirinya sebagai individu, bukan sekadar mengirim pesan massal (*copy-paste*).

#### 2. Hindari Pertanyaan yang Terlalu Menginterogasi
Jangan bertanya layaknya petugas sensus:
* ❌ *"Nama asli siapa? Asal mana? Anak ke berapa? Kos di mana?"*
* ✅ *"Aku liat kamu jurusan Informatika juga ya, lagi pusing ngerjain project apa semester ini?"*

#### 3. Hargai Waktu dan Ritme Balas Pesan
Setiap mahasiswa memiliki kesibukan: praktikum, kuliah pagi, tugas kelompok, atau magang. Jika match Anda belum membalas dalam beberapa jam:
* Jangan mengirim spam tanda tanya (???)
* Jangan tersinggung atau mengirim pesan bernada menuduh
* Berikan ruang yang wajar; percakapan berkualitas tidak membutuhkan balasan instan setiap detik.

---

### Kapan Waktu yang Tepat Mengajak Bertemu?
Jika setelah 2-3 hari obrolan mengalir santai dan terasa nyaman bagi kedua belah pihak, Anda bisa menawarkan ajakan sederhana di ruang publik:
*"Kebetulan besok sore aku ada agenda di perpustakaan kota/kafe X, kalau kamu senggang mau mampir bareng?"*
    `,
  },
  {
    slug: 'kenapa-verifikasi-mahasiswa-penting',
    title: 'Kenapa Verifikasi Mahasiswa Penting untuk Platform Social Matching?',
    excerpt: 'Alasan mendasar di balik sistem verifikasi KTM di NIVA: menciptakan ekosistem sebaya, mengurangi risiko anonimitas berbahaya, dan menjaga privasi.',
    date: '2026-09-01',
    readTime: '6 menit baca',
    author: 'Founding Team NIVA',
    authorRole: 'Platform Architecture & Ethics',
    category: 'Filosofi Produk',
    relatedSlugs: ['keamanan-dating-online', 'cara-mengenali-akun-palsu'],
    content: `
### Ruang Temu Khusus Mahasiswa yang Sesungguhnya

Banyak aplikasi kencan konvensional menghadapi masalah klasik: siapa pun bisa mendaftar dengan identitas fiktif. Mahasiswa sering kali harus berhadapan dengan akun promosi komersial, profil palsu, atau pihak-pihak yang memiliki niat tidak baik dan bukan bagian dari kelompok sebaya.

---

### Mengapa NIVA Memilih Jalur Verifikasi?

#### 1. Komunitas Sebaya (*Peer Community*) yang Relevan
Mahasiswa memiliki dinamika hidup yang unik: fase transisi menuju kedewasaan, beban akademik, cita-cita karir, dan gaya hidup kampus. Ketika semua pengguna di platform telah terverifikasi sebagai mahasiswa aktif, obrolan menjadi jauh lebih nyambung dan bermakna.

#### 2. Mengurangi Keberanian Berperilaku Buruk (*Accountability*)
Anonimitas total di internet sering kali memicu perilaku pelecehan atau kata-kata kasar. Dengan adanya verifikasi kartu mahasiswa, setiap akun memiliki sinyal akuntabilitas yang nyata, sehingga tercipta rasa saling menghormati di ruang percakapan.

#### 3. Melindungi Privasi dengan Sangat Ketat
Penting untuk digarisbawahi:
> **Verifikasi di NIVA dilakukan untuk memastikan sinyal keaslian status mahasiswa, bukan untuk menyebarkan data Anda.**

Foto kartu mahasiswa dianalisa secara terenkripsi dan dihapus sesuai kebijakan batas waktu (*retention policy*). Nomor Induk Mahasiswa (NIM) Anda tidak pernah ditampilkan ke pengguna lain. Privasi Anda adalah hak mutlak yang kami jaga.
    `,
  },
];

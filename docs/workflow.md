## 1️⃣ Clone & Update Project

```bash
git clone https://github.com/MJohanBintangP/MBG-App.git
cd code
git checkout development
git pull origin development
```

> **Catatan:**  
> Semua development dilakukan dari branch `development`, **bukan dari `main`**.

---

## 2️⃣ Flow Trello (Manajemen Task)

1. Ambil **card fitur** dari list **To Do**
2. Pindahkan card ke **In Progress**
3. Kerjakan task sesuai pembagian

---

## 3️⃣ Membuat Branch untuk Task

Setiap task **WAJIB** menggunakan branch terpisah.

```bash
git checkout -b <kategori>/<nama-task>
```

**Contoh:**

```bash
git checkout -b feature/login-user
git checkout -b bugfix/error-print-invoice
```

> cek format nama branch di file **git_guideline.md**

---

## 4️⃣ Commit & Push Perubahan

```bash
git add .
git commit -m "<kategori>: <pesan-commit>"
git push origin <kategori>/<nama-task>
```

**Contoh:**

```bash
git commit -m "feat: tambah fitur login user"
git commit -m "fix: perbaiki error hitung total invoice"
```

> cek format pesan commmit di file **git_guideline.md**

---

## 5️⃣ Pull Request ke GitHub

1. Buka tab **Pull Requests**
2. Klik **New Pull Request**
3. Atur:
   - **Base**: `development`
   - **Compare**: branch kamu
4. Klik **Create Pull Request**
5. Tambahkan deskripsi singkat jika diperlukan
6. Klik **Create Pull Request**

---

## 6️⃣ Update Status Trello

- Setelah Pull Request dibuat  
  → Pindahkan card ke **NEED REVIEW**

---

## 📌 Aturan Penting

- ❌ Dilarang commit langsung ke `development` atau `main`
- ✅ Satu branch = satu task
- ✅ Selalu update dari `development` sebelum mulai kerja
- ✅ Pastikan pesan commit jelas & konsisten

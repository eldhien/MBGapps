1. Branch

| Type     | Fungsi                                  |
| -------- | --------------------------------------- |
| feature  | Fitur baru                              |
| bugfix   | Perbaikan bug                           |
| hotfix   | Bug urgent di production                |
| refactor | Perombakan / perapihan kode             |
| chore    | Konfigurasi, setup, atau task non-fitur |

- Format Nama Branch
  <type>/<deskripsi-singkat>

Contoh:

- feature/login-user
- bugfix/total-harga-salah
- hotfix/app-crash-on-start
- refactor/state-management
- chore/init-project-structure

2. Pesan Commit

| Type     | Kapan Dipakai                               |
| -------- | ------------------------------------------- |
| feat     | Nambah fitur baru                           |
| fix      | Benerin bug                                 |
| refactor | Ubah struktur kode tanpa ubah fitur         |
| style    | Format kode (spasi, indent, dll)            |
| docs     | Dokumentasi                                 |
| test     | Nambah / update test                        |
| chore    | Hal non-feature (config, dependency, build) |

- Format Pesan Commit
  <type>(scope): deskripsi singkat

- Contoh Commit yang Bagus

- feat(auth): tambah fitur login user
- fix(invoice): perbaiki kalkulasi total harga
- refactor(ui): pisahkan komponen header
- docs(readme): update cara install aplikasi
- chore(deps): update dependency electron

3. Aturan Umum

- Gunakan huruf kecil dan tanda minus (-)
- Satu branch & satu commit fokus ke satu tujuan
- Hindari commit ambigu seperti: update, fix, coba-coba

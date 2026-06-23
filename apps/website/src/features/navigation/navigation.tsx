import type React from "react"
import type { UserRole } from "@/features/auth/types"
import {
  ClipboardCheckIcon,
  FileTextIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  PackagePlusIcon,
  QrCodeIcon,
  SchoolIcon,
  Settings2Icon,
  ShieldCheckIcon,
  TruckIcon,
  UsersIcon,
} from "lucide-react"

export type AppPageKey =
  | "dashboard"
  | "users"
  | "schoolAccounts"
  | "batch"
  | "kitchenChecklist"
  | "distribution"
  | "masterData"
  | "reports"
  | "scanQr"
  | "receivingValidation"
  | "foodReports"
  | "studentComplaints"
  | "history"

export type NavigationPage = {
  key: AppPageKey
  title: string
  path: string
  allowedRoles: UserRole[]
  icon: React.ReactNode
  features: string[]
}

const allRoles: UserRole[] = ["SUPER_ADMIN", "SPPG", "SEKOLAH"]
const sppgRoles: UserRole[] = ["SUPER_ADMIN", "SPPG"]
const schoolRoles: UserRole[] = ["SUPER_ADMIN", "SEKOLAH"]

export const navigationPages: NavigationPage[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    path: "/dashboard",
    allowedRoles: allRoles,
    icon: <LayoutDashboardIcon />,
    features: [
      "Dashboard analitik real-time: jumlah batch, status keamanan, distribusi, laporan sekolah, tren risiko.",
    ],
  },
  {
    key: "users",
    title: "Pengguna",
    path: "/users",
    allowedRoles: ["SUPER_ADMIN"],
    icon: <UsersIcon />,
    features: ["Manajemen pengguna multi-role: Super Admin, SPPG, dan Sekolah."],
  },
  {
    key: "schoolAccounts",
    title: "Akun Sekolah",
    path: "/school-accounts",
    allowedRoles: sppgRoles,
    icon: <SchoolIcon />,
    features: [
      "Penambahan akun sekolah beserta data sekolah dan progress awal.",
      "Akun sekolah dipakai bersama oleh kepala sekolah atau guru.",
    ],
  },
  {
    key: "batch",
    title: "Produksi Batch",
    path: "/batch",
    allowedRoles: sppgRoles,
    icon: <PackagePlusIcon />,
    features: [
      "Pembuatan batch makanan: nama menu, jumlah porsi, komposisi makanan, waktu produksi, petugas driver, foto.",
      "Sistem Batch ID unik untuk setiap produksi makanan.",
      "Generate QR Code untuk setiap batch makanan.",
    ],
  },
  {
    key: "kitchenChecklist",
    title: "Checklist Kebersihan",
    path: "/kitchen-checklist",
    allowedRoles: sppgRoles,
    icon: <ClipboardCheckIcon />,
    features: [
      "Checklist kebersihan dapur digital.",
      "Upload foto seminggu sekali: APD, alat, kebersihan, timestamp, kondisi dapur.",
    ],
  },
  {
    key: "distribution",
    title: "Distribusi",
    path: "/distribution",
    allowedRoles: sppgRoles,
    icon: <TruckIcon />,
    features: [
      "Manajemen distribusi makanan: ID batch, ID sekolah, waktu kirim, jumlah porsi, status pengiriman.",
    ],
  },
  {
    key: "masterData",
    title: "Master Data",
    path: "/master-data",
    allowedRoles: sppgRoles,
    icon: <Settings2Icon />,
    features: [
      "Data driver.",
      "Laporan dari sekolah.",
      "Riwayat batch makanan dan distribusi.",
    ],
  },
  {
    key: "reports",
    title: "Laporan",
    path: "/reports",
    allowedRoles: sppgRoles,
    icon: <FileTextIcon />,
    features: [
      "Riwayat laporan sekolah dan keluhan siswa.",
      "Export laporan PDF: produksi, distribusi, risiko, keluhan.",
      "Deteksi pola keluhan siswa lintas sekolah untuk evaluasi SPPG.",
    ],
  },
  {
    key: "scanQr",
    title: "Scan QR",
    path: "/scan-qr",
    allowedRoles: schoolRoles,
    icon: <QrCodeIcon />,
    features: [
      "Scan QR Code melalui website sekolah.",
      "Tampilan detail batch setelah scan: ID Batch, porsi makanan, petugas driver.",
    ],
  },
  {
    key: "receivingValidation",
    title: "Validasi Penerimaan",
    path: "/receiving-validation",
    allowedRoles: schoolRoles,
    icon: <ShieldCheckIcon />,
    features: [
      "Validasi penerimaan makanan manual.",
      "Field catatan.",
      "Tombol Selesai dan Ditolak.",
    ],
  },
  {
    key: "foodReports",
    title: "Laporan Masalah",
    path: "/food-reports",
    allowedRoles: schoolRoles,
    icon: <FileTextIcon />,
    features: [
      "Pelaporan masalah makanan setelah dikonsumsi: basi, rusak, terlambat, suhu tidak sesuai, dan lainnya.",
    ],
  },
  {
    key: "studentComplaints",
    title: "Keluhan Siswa",
    path: "/student-complaints",
    allowedRoles: schoolRoles,
    icon: <SchoolIcon />,
    features: [
      "Pelaporan keluhan siswa: jumlah siswa, gejala, waktu kejadian, tindakan.",
    ],
  },
  {
    key: "history",
    title: "Riwayat",
    path: "/history",
    allowedRoles: schoolRoles,
    icon: <HistoryIcon />,
    features: [
      "Riwayat batch makanan dan distribusi.",
      "Riwayat laporan sekolah dan keluhan siswa.",
    ],
  },
]

export function canAccessPage(page: NavigationPage, role?: UserRole | null) {
  return role ? page.allowedRoles.includes(role) : false
}

export function getVisibleNavigation(role?: UserRole | null) {
  return navigationPages.filter((page) => canAccessPage(page, role))
}

export function findNavigationPage(path: string) {
  return navigationPages.find((page) => page.path === path)
}

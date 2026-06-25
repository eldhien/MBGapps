import type React from "react"
import type { UserRole } from "@/features/auth/types"
import {
  ClipboardCheckIcon,
  BrainCircuitIcon,
  DownloadIcon,
  FileTextIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  PackagePlusIcon,
  SchoolIcon,
  Settings2Icon,
  ShieldCheckIcon,
  TruckIcon,
  UploadIcon,
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
  children?: {
    title: string
    path: string
    icon?: React.ReactNode
  }[]
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
    key: "batch",
    title: "Produksi Batch",
    path: "/batch",
    allowedRoles: sppgRoles,
    icon: <PackagePlusIcon />,
    features: [
      "Pembuatan batch makanan: nama menu, jumlah porsi, komposisi makanan, waktu produksi, petugas driver, foto.",
      "Sistem Batch ID unik untuk setiap produksi makanan.",
    ],
    children: [
      {
        title: "Upload Batch",
        path: "/batch/create",
        icon: <UploadIcon />,
      },
      {
        title: "Riwayat Batch Makanan",
        path: "/batch",
        icon: <HistoryIcon />,
      },
    ],
  },
  {
    key: "kitchenChecklist",
    title: "Laporan Kebersihan",
    path: "/cleanliness-reports",
    allowedRoles: sppgRoles,
    icon: <ClipboardCheckIcon />,
    features: [
      "Laporan kebersihan dapur digital.",
      "Upload foto seminggu sekali: APD, alat, kebersihan, dan kondisi dapur.",
    ],
    children: [
      {
        title: "Upload Laporan",
        path: "/cleanliness-reports/upload",
        icon: <UploadIcon />,
      },
      {
        title: "Riwayat Laporan",
        path: "/cleanliness-reports/history",
        icon: <HistoryIcon />,
      },
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
    children: [
      {
        title: "Upload Distribusi",
        path: "/distribution",
        icon: <UploadIcon />,
      },
      {
        title: "Riwayat Distribusi",
        path: "/distribution/history",
        icon: <HistoryIcon />,
      },
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
      "Data akun sekolah.",
    ],
    children: [
      {
        title: "Akun Sekolah",
        path: "/school-accounts",
        icon: <SchoolIcon />,
      },
      {
        title: "Driver",
        path: "/master-data/drivers",
        icon: <TruckIcon />,
      },
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
    children: [
      {
        title: "Riwayat Laporan Sekolah",
        path: "/reports/school-reports",
        icon: <FileTextIcon />,
      },
      {
        title: "Riwayat Keluhan Siswa",
        path: "/reports/student-complaints",
        icon: <HistoryIcon />,
      },
      {
        title: "Export Laporan PDF",
        path: "/reports/export-pdf",
        icon: <DownloadIcon />,
      },
      {
        title: "Deteksi Pola Keluhan Siswa (AI)",
        path: "/reports/complaint-patterns-ai",
        icon: <BrainCircuitIcon />,
      },
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
    children: [
      {
        title: "Riwayat Batch Makanan",
        path: "/history/batches",
        icon: <FileTextIcon />,
      },
      {
        title: "Riwayat Distribusi",
        path: "/history/distributions",
        icon: <HistoryIcon />,
      },
      {
        title: "Riwayat Laporan Sekolah",
        path: "/history/school-reports",
        icon: <FileTextIcon />,
      },
      {
        title: "Riwayat Keluhan Siswa",
        path: "/history/student-complaints",
        icon: <HistoryIcon />,
      },
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
  return navigationPages.find(
    (page) =>
      page.path === path || page.children?.some((child) => child.path === path)
  )
}

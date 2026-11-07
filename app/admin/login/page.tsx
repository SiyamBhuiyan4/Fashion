import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/server/admin";
import { AdminLogin } from "@/components/admin/AdminLogin";

export const metadata: Metadata = {
  title: "Admin sign in · Aurevya",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <AdminLogin configured={adminConfigured()} />;
}

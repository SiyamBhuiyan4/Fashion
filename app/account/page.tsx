import type { Metadata } from "next";
import { Account } from "@/components/ui/Account";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return <Account />;
}

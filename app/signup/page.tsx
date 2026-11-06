import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/ui/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}

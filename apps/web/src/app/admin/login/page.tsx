import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Administrator Sign In",
  description: "Secure administrator access to Travelers Safety Covered.",
};

export default function AdminLoginPage() {
  return <AuthForm mode="login" accountType="admin" />;
}

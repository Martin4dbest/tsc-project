import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Travelers Safety Covered traveller account.",
};

export default function RegisterPage() {
  return <AuthForm mode="register" accountType="traveller" />;
}

import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Traveller Sign In",
  description: "Sign in to your Travelers Safety Covered account.",
};

export default function LoginPage() {
  return <AuthForm mode="login" accountType="traveller" />;
}

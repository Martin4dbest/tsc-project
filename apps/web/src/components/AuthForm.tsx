"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "register";
type AccountType = "traveller" | "admin";

interface AuthFormProps {
  mode: AuthMode;
  accountType?: AccountType;
}

export default function AuthForm({
  mode,
  accountType = "traveller",
}: AuthFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isRegister = mode === "register";
  const isAdmin = accountType === "admin";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.session && data.user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role, account_status")
            .eq("user_id", data.user.id)
            .single();

          if (profileError) throw profileError;

          if (
            profile.role !== "traveller" ||
            profile.account_status !== "active"
          ) {
            await supabase.auth.signOut();
            throw new Error("This registration is not available for this account.");
          }

          router.replace("/dashboard");
          router.refresh();
          return;
        }

        setMessage(
          "Your registration was received. Please check your email for a confirmation link before signing in."
        );
        return;
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (signInError) throw signInError;

      if (!data.user) {
        throw new Error("Unable to verify your account. Please try again.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, account_status")
        .eq("user_id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("Your account profile could not be verified.");
      }

      if (profile.account_status !== "active") {
        await supabase.auth.signOut();
        throw new Error(
          "Your account is currently suspended. Please contact support."
        );
      }

      const isAdministrator =
        profile.role === "admin" || profile.role === "super_admin";

      if (isAdmin && !isAdministrator) {
        await supabase.auth.signOut();
        throw new Error(
          "This account does not have administrator access."
        );
      }

      if (!isAdmin && isAdministrator) {
        router.replace("/admin");
        router.refresh();
        return;
      }

      if (isAdmin) {
        router.replace("/admin");
      } else if (profile.role === "traveller") {
        router.replace("/dashboard");
      } else {
        await supabase.auth.signOut();
        throw new Error("Your account does not have permission to continue.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand">
          <Image
            src="/brand/tsc-full-logo.png"
            alt="Travelers Safety Covered"
            width={220}
            height={90}
            priority
          />
        </Link>

        <div className="auth-heading">
          <span className="auth-eyebrow">
            {isAdmin ? "ADMINISTRATION PORTAL" : "TRAVEL WITH CONFIDENCE"}
          </span>

          <h1>
            {isRegister
              ? "Create your account"
              : isAdmin
                ? "Administrator sign in"
                : "Welcome back"}
          </h1>

          <p>
            {isRegister
              ? "Register to access your Travelers Safety Covered account."
              : isAdmin
                ? "Sign in with your authorised administrator account."
                : "Sign in to manage your journeys and travel safety."}
          </p>
        </div>

        {error && (
          <div className="auth-alert auth-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="auth-alert auth-success" role="status">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <>
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />

              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </>
          )}

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={isRegister ? "Create a password" : "Enter your password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          <button type="submit" disabled={loading} className="auth-submit">
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-footer">
          {isAdmin ? (
            <Link href="/login">Traveller sign in</Link>
          ) : isRegister ? (
            <p>
              Already registered? <Link href="/login">Sign in</Link>
            </p>
          ) : (
            <p>
              New to TSC? <Link href="/register">Create an account</Link>
            </p>
          )}
        </div>

        <Link href="/" className="auth-home-link">
          Back to homepage
        </Link>
      </section>
    </main>
  );
}

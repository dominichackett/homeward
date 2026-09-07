"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  HeartHandshake
} from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") || "/dashboard";

  const [authMode, setAuthMode] = useState<"magic_link" | "password">("magic_link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // 1. Submit Magic Link / OTP
  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // Local demo fallback if Supabase credentials are not yet added to .env.local
      localStorage.setItem(
        "homeward_caregiver_session",
        JSON.stringify({ email, id: "demo-caregiver-001", role: "authenticated" })
      );
      setTimeout(() => {
        setIsLoading(false);
        router.push(redirectTo);
      }, 600);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      setMagicLinkSent(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send magic link. Please check your email address.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit Password Sign-In
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // Demo session fallback
      localStorage.setItem(
        "homeward_caregiver_session",
        JSON.stringify({ email, id: "demo-caregiver-001", role: "authenticated" })
      );
      setTimeout(() => {
        setIsLoading(false);
        router.push(redirectTo);
      }, 600);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.push(redirectTo);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">Homeward</span>
          </Link>
          <span className="text-xs text-slate-400 font-mono">Caregiver Access Gate</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in flex flex-col items-center text-center">
          {/* Lock Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-950 via-slate-800 to-blue-950 border border-cyan-800/60 shadow-xl flex items-center justify-center mb-4 relative">
            <Lock className="w-8 h-8 text-cyan-400" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">Caregiver Sign In</h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xs">
            Personal profiles, medical de-escalation notes, and next-of-kin alerts are strictly restricted to verified guardians.
          </p>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2 text-left w-full">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Magic Link Sent State */}
          {magicLinkSent ? (
            <div className="mt-6 w-full p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 text-left space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Magic Link Dispatched</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                We sent a secure one-click sign-in link to <strong className="text-white">{email}</strong>.
                Click the link in your email to instantly unlock your Caregiver Dashboard.
              </p>
              <button
                onClick={() => setMagicLinkSent(false)}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium pt-1"
              >
                Enter a different email
              </button>
            </div>
          ) : (
            <>
              {/* Mode Toggle */}
              <div className="mt-6 w-full grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAuthMode("magic_link")}
                  className={`py-1.5 rounded-lg font-medium transition-colors ${
                    authMode === "magic_link"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Email Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("password")}
                  className={`py-1.5 rounded-lg font-medium transition-colors ${
                    authMode === "password"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Password
                </button>
              </div>

              {/* Sign-In Form */}
              <form
                onSubmit={authMode === "magic_link" ? handleMagicLinkSignIn : handlePasswordSignIn}
                className="mt-4 w-full space-y-3.5 text-left"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Caregiver Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. guardian@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all"
                    />
                  </div>
                </div>

                {authMode === "password" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>{authMode === "magic_link" ? "Send Secure Magic Link" : "Sign In to Dashboard"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Privacy Guarantee Note */}
          <div className="mt-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 text-left flex items-start gap-2">
            <HeartHandshake className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Homeward uses Supabase Row-Level Security (RLS) to enforce that only verified guardians access enrollment and emergency response controls.
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-3 text-center text-xs text-slate-600">
        <p>Homeward Safety Network &bull; Zero-Knowledge Biometric Identity Resolution</p>
      </footer>
    </div>
  );
}

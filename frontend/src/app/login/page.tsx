"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to log in. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass = "CredChain2026!") => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-50 border border-indigo-100 rounded-3xl text-indigo-600 shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign in to CredChain
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Authorized institutional portal for academic credential issuance and management
          </p>
        </div>

        {error && (
          <Alert variant="danger" title="Authentication Error">
            {error}
          </Alert>
        )}

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Institutional Email"
              type="email"
              placeholder="e.g. issuer@apex.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Demo Accounts Quick-Fill
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@apex.edu", "ApexAdmin2026!")}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-xs group"
              >
                <span className="font-bold text-slate-800 block group-hover:text-indigo-600">🎓 University Admin</span>
                <span className="text-[10px] text-slate-400 font-mono">admin@apex.edu</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("issuer@apex.edu", "ApexIssuer2026!")}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-xs group"
              >
                <span className="font-bold text-slate-800 block group-hover:text-indigo-600">✍️ Registrar Issuer</span>
                <span className="text-[10px] text-slate-400 font-mono">issuer@apex.edu</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("verifier@public.org", "Verifier2026!")}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-xs group"
              >
                <span className="font-bold text-slate-800 block group-hover:text-indigo-600">🔍 Public Verifier</span>
                <span className="text-[10px] text-slate-400 font-mono">verifier@public.org</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("superadmin@credchain.com", "SuperAdmin2026!")}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-xs group"
              >
                <span className="font-bold text-slate-800 block group-hover:text-indigo-600">⚡ Super Admin</span>
                <span className="text-[10px] text-slate-400 font-mono">superadmin@...</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400">
          Public verification remains available without login at{" "}
          <a href="/verify" className="text-indigo-600 hover:underline font-semibold">
            /verify
          </a>
        </div>
      </div>
    </div>
  );
}

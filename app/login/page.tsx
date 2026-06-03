import { Suspense } from "react";
import Link from "next/link";
import { Diamond } from "lucide-react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(201,169,97,0.08),transparent_60%)]" />

      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-gold-light to-gold-dark text-text-dark">
            <Diamond className="h-4 w-4" />
          </span>
          <span className="font-display text-xl tracking-tight">
            Distress<span className="text-gold-light">Hub</span>
          </span>
        </Link>

        <div className="rounded-xl border border-divider bg-bg-card p-8 shadow-2xl">
          <h1 className="font-display text-2xl">Investor access</h1>
          <p className="mt-2 text-sm text-text-dim">
            Demo password is gated by an env var. Investor SSO ships in v2.
          </p>

          <Suspense fallback={<div className="mt-8 h-40 animate-pulse rounded-md bg-bg-alt" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 border-t border-divider pt-4 text-[11px] text-text-dim">
            Demo password:{" "}
            <code className="font-mono text-gold-light">distress2026</code>
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block text-xs text-text-dim hover:text-gold-light"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Diamond } from "lucide-react";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(201,169,97,0.08),transparent_60%)]" />

      <div className="flex w-full max-w-md flex-col items-center">
        <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-gold-light to-gold-dark text-text-dark">
            <Diamond className="h-4 w-4" />
          </span>
          <span className="font-display text-xl tracking-tight">
            Distress<span className="text-gold-light">Hub</span>
          </span>
        </Link>

        <SignUp signInUrl="/sign-in" forceRedirectUrl="/dashboard" />

        <Link href="/" className="mt-6 text-xs text-text-dim hover:text-gold-light">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}

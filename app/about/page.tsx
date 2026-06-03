import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AboutPage() {
  return (
    <>
      <Navbar variant="public" />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-20">
          <Badge variant="gold" className="mb-5">Company</Badge>
          <h1 className="font-display text-4xl md:text-5xl leading-tight">
            We&apos;re building India&apos;s clearing house for distressed real estate.
          </h1>
          <p className="mt-6 text-lg text-text-dim leading-relaxed">
            India holds <span className="text-text">₹6.2 lakh crore</span> of stressed real estate assets
            across SARFAESI auctions, NCLT liquidations, and NARCL disposals. The data lives in six
            portals — each with its own schema, its own pagination, its own quirks.
          </p>
          <p className="mt-4 text-lg text-text-dim leading-relaxed">
            DistressHub ingests them all. We normalise, score, and serve every distressed asset through a
            single investor-grade dashboard.
          </p>

          <div className="mt-12 space-y-8">
            <Section title="The DH Score">
              A deterministic 0–100 score blending five signals: discount to FMV (35%), title health
              (20%), possession state (15%), city liquidity (20%), and renovation lift (10%). The model
              is heuristic today and ships as an ML regression with 1k+ closed deals in Q1 FY27.
            </Section>
            <Section title="The Operator Layer">
              Our acquisitions team uses the same data the dashboard exposes — plus an internal Kanban
              pipeline. This means by the time a deal appears on the investor dashboard, our team has
              already done a first-pass title scan. That&apos;s the moat.
            </Section>
            <Section title="The Roadmap">
              FY27 ships pan-India coverage (Mumbai, Bangalore, Hyderabad, Chennai, Kolkata), the ML
              scoring model, and a retail-investor email digest. FY28 adds bid representation services.
            </Section>
          </div>

          <div className="mt-16 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                See live dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/deals">Browse deals</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-3 text-text-dim leading-relaxed">{children}</p>
    </div>
  );
}

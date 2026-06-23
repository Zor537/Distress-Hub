/**
 * DistressHub one-page investor memo — React PDF document.
 *
 * Server-renders via @react-pdf/renderer in the /api/properties/[id]/memo route.
 * Pulls together the DH Score breakdown, financial model snapshot, and a
 * Claude-written narrative section.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Signals, SignalExplanations } from "@/lib/scoring";
import type { FinancialModelResult } from "@/lib/financial-model";

// Register Inter for nicer typography (graceful fallback if unreachable).
try {
  Font.register({
    family: "Inter",
    fonts: [
      { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.ttf", fontWeight: 400 },
      { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.ttf", fontWeight: 500 },
      { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.ttf", fontWeight: 700 },
    ],
  });
} catch {
  // Font registration errors shouldn't block PDF gen; default to Helvetica
}

const COLORS = {
  bg: "#0A0E1A",
  bgCard: "#1A2240",
  bgAlt: "#121830",
  gold: "#C9A961",
  goldLight: "#E8C77E",
  goldDark: "#8B7340",
  cream: "#F7F4ED",
  text: "#FFFFFF",
  textDim: "#B8B5AE",
  divider: "#2A3354",
  success: "#5FB97F",
  danger: "#D97757",
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontFamily: "Helvetica",
    fontSize: 10,
  },

  // Header
  header: { marginBottom: 16, borderBottomColor: COLORS.gold, borderBottomWidth: 0.5, paddingBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { color: COLORS.goldLight, fontSize: 9, letterSpacing: 2, textTransform: "uppercase" },
  date: { color: COLORS.textDim, fontSize: 8 },
  title: { fontSize: 18, color: COLORS.text, marginTop: 8, fontWeight: 500 },
  subtitle: { fontSize: 9, color: COLORS.textDim, marginTop: 3 },

  // Two-column body
  body: { flexDirection: "row", gap: 16, marginTop: 16 },
  leftCol: { flex: 1 },
  rightCol: { width: 200 },

  // Sections
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 8, color: COLORS.textDim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },

  // DH Score block
  scoreCard: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderColor: COLORS.gold,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: { fontSize: 22, color: COLORS.goldLight, fontWeight: 700 },
  scoreLabel: { fontSize: 7, color: COLORS.textDim, marginTop: 1 },
  signalsList: { flex: 1, gap: 6 },
  signalRow: {},
  signalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  signalLabel: { fontSize: 9, color: COLORS.text, fontWeight: 500 },
  signalScore: { fontSize: 9, color: COLORS.textDim },
  signalBar: { backgroundColor: COLORS.divider, height: 4, borderRadius: 2, marginTop: 1 },
  signalFill: { backgroundColor: COLORS.gold, height: 4, borderRadius: 2 },
  signalExplain: { fontSize: 7, color: COLORS.textDim, marginTop: 2, lineHeight: 1.4 },

  // Financial table
  factsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  factCell: {
    width: "50%",
    marginBottom: 10,
  },
  factLabel: { fontSize: 7, color: COLORS.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 },
  factValue: { fontSize: 11, color: COLORS.text, fontWeight: 500 },
  factValuePrimary: { fontSize: 13, color: COLORS.goldLight, fontWeight: 700 },
  factValueSuccess: { fontSize: 11, color: COLORS.success, fontWeight: 500 },

  // Sidebar
  sidebarCard: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  sidebarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  sidebarKey: { fontSize: 8, color: COLORS.textDim },
  sidebarVal: { fontSize: 8, color: COLORS.text, fontWeight: 500 },
  kpiCard: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.gold,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    alignItems: "center",
  },
  kpiLabel: { fontSize: 7, color: COLORS.textDim, letterSpacing: 1, textTransform: "uppercase" },
  kpiValue: { fontSize: 18, color: COLORS.goldLight, fontWeight: 700, marginTop: 3 },

  // Narrative
  narrative: {
    backgroundColor: COLORS.bgAlt,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 12,
    marginTop: 4,
  },
  narrativePara: { fontSize: 9, color: COLORS.text, lineHeight: 1.55, marginBottom: 6 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    borderTopColor: COLORS.divider,
    borderTopWidth: 0.5,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: COLORS.textDim },
});

function formatINR(n: number | null | undefined, opts?: { short?: boolean }): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const short = opts?.short ?? true;
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `Rs ${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `Rs ${(n / 1_00_000).toFixed(short ? 1 : 2)} L`;
  if (abs >= 1_000) return `Rs ${(n / 1_000).toFixed(0)}K`;
  return `Rs ${n.toFixed(0)}`;
}

function formatPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "TBD";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export type MemoData = {
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    bank: string;
    propertyType: string;
    reservePrice: number;
    estimatedFmv: number | null;
    discountPct: number | null;
    builtUpArea: number | null;
    bedrooms: number | null;
    auctionDate: Date | string | null;
    possessionType: string | null;
    sourceUrl: string;
    dhScore: number | null;
    source: string;
  };
  signals: Signals | null;
  explanations: SignalExplanations | null;
  financial: FinancialModelResult;
  narrative: string[]; // pre-split paragraphs
};

const SIGNALS_META: { key: keyof Signals; label: string; weight: number }[] = [
  { key: "discountScore", label: "Discount", weight: 35 },
  { key: "titleScore", label: "Title Health", weight: 20 },
  { key: "possessionScore", label: "Possession", weight: 15 },
  { key: "liquidityScore", label: "Liquidity", weight: 20 },
  { key: "renovationScore", label: "Renovation Lift", weight: 10 },
];

export function MemoDocument({ data }: { data: MemoData }) {
  const { property: p, signals, explanations, financial, narrative } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.brand}>DistressHub · Investor Memo</Text>
            <Text style={styles.date}>{formatDate(new Date())}</Text>
          </View>
          <Text style={styles.title}>{p.title}</Text>
          <Text style={styles.subtitle}>
            {p.address} · {p.city}, {p.state} · {p.bank} · {p.source}
          </Text>
        </View>

        {/* Two columns */}
        <View style={styles.body}>
          <View style={styles.leftCol}>
            {/* DH Score */}
            <View style={styles.scoreCard}>
              <Text style={styles.sectionTitle}>DH Score · Deal Quality</Text>
              <View style={styles.scoreRow}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNum}>{p.dhScore ?? "—"}</Text>
                  <Text style={styles.scoreLabel}>/ 100</Text>
                </View>
                <View style={styles.signalsList}>
                  {signals && explanations
                    ? SIGNALS_META.map(({ key, label, weight }) => {
                        const v = signals[key];
                        return (
                          <View key={key} style={styles.signalRow}>
                            <View style={styles.signalHeader}>
                              <Text style={styles.signalLabel}>{label}</Text>
                              <Text style={styles.signalScore}>
                                {v}/100 · {weight}%
                              </Text>
                            </View>
                            <View style={styles.signalBar}>
                              <View
                                style={[styles.signalFill, { width: `${v}%` }]}
                              />
                            </View>
                          </View>
                        );
                      })
                    : null}
                </View>
              </View>
            </View>

            {/* Property facts */}
            <Text style={styles.sectionTitle}>Property Facts</Text>
            <View style={styles.factsGrid}>
              <View style={styles.factCell}>
                <Text style={styles.factLabel}>Reserve Price</Text>
                <Text style={styles.factValuePrimary}>{formatINR(p.reservePrice)}</Text>
              </View>
              <View style={styles.factCell}>
                <Text style={styles.factLabel}>Estimated FMV</Text>
                <Text style={styles.factValue}>{formatINR(p.estimatedFmv)}</Text>
              </View>
              <View style={styles.factCell}>
                <Text style={styles.factLabel}>Discount to FMV</Text>
                <Text style={styles.factValueSuccess}>{formatPct(p.discountPct)}</Text>
              </View>
              <View style={styles.factCell}>
                <Text style={styles.factLabel}>Auction Date</Text>
                <Text style={styles.factValue}>{formatDate(p.auctionDate)}</Text>
              </View>
              <View style={styles.factCell}>
                <Text style={styles.factLabel}>Built-Up Area</Text>
                <Text style={styles.factValue}>
                  {p.builtUpArea ? `${p.builtUpArea.toLocaleString("en-IN")} sq ft` : "—"}
                </Text>
              </View>
              <View style={styles.factCell}>
                <Text style={styles.factLabel}>Possession</Text>
                <Text style={styles.factValue}>{p.possessionType ?? "Unknown"}</Text>
              </View>
            </View>

            {/* Narrative */}
            <View style={[styles.section, { marginTop: 4 }]}>
              <Text style={styles.sectionTitle}>Investment Narrative</Text>
              <View style={styles.narrative}>
                {narrative.map((para, i) => (
                  <Text key={i} style={styles.narrativePara}>
                    {para}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* Right sidebar — KPIs + diligence facts */}
          <View style={styles.rightCol}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Projected IRR</Text>
              <Text style={styles.kpiValue}>{formatPct(financial.irr)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>MOIC</Text>
              <Text style={styles.kpiValue}>{financial.moic.toFixed(2)}x</Text>
            </View>

            <Text style={styles.sectionTitle}>Unit Economics</Text>
            <View style={styles.sidebarCard}>
              <View style={styles.sidebarRow}>
                <Text style={styles.sidebarKey}>Total Investment</Text>
                <Text style={styles.sidebarVal}>{formatINR(financial.totalInvestment)}</Text>
              </View>
              <View style={styles.sidebarRow}>
                <Text style={styles.sidebarKey}>Acquisition Cost</Text>
                <Text style={styles.sidebarVal}>{formatINR(financial.acquisitionCost)}</Text>
              </View>
              <View style={styles.sidebarRow}>
                <Text style={styles.sidebarKey}>Renovation</Text>
                <Text style={styles.sidebarVal}>{formatINR(financial.inputs.renovationCost)}</Text>
              </View>
              <View style={styles.sidebarRow}>
                <Text style={styles.sidebarKey}>Hold (months)</Text>
                <Text style={styles.sidebarVal}>{financial.inputs.holdMonths}</Text>
              </View>
              <View style={styles.sidebarRow}>
                <Text style={styles.sidebarKey}>Exit Value</Text>
                <Text style={styles.sidebarVal}>{formatINR(financial.exitValue)}</Text>
              </View>
              <View style={[styles.sidebarRow, { marginBottom: 0 }]}>
                <Text style={styles.sidebarKey}>Gross Profit</Text>
                <Text style={[styles.sidebarVal, { color: COLORS.goldLight }]}>
                  {formatINR(financial.grossProfit)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Signal Detail</Text>
            <View style={styles.sidebarCard}>
              {explanations
                ? SIGNALS_META.map(({ key, label }) => (
                    <View key={key} style={{ marginBottom: 5 }}>
                      <Text style={[styles.sidebarKey, { fontWeight: 700, color: COLORS.text }]}>
                        {label}
                      </Text>
                      <Text style={[styles.sidebarKey, { marginTop: 1, lineHeight: 1.4 }]}>
                        {explanations[key]}
                      </Text>
                    </View>
                  ))
                : (
                    <Text style={styles.sidebarKey}>Score pending.</Text>
                  )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            distresshub-zor1.vercel.app · {p.source} listing {p.id.slice(0, 8)}
          </Text>
          <Text style={styles.footerText}>
            Not investment advice · For accredited investors only
          </Text>
        </View>
      </Page>
    </Document>
  );
}

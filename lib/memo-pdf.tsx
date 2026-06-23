/**
 * DistressHub investor memo — 2-page React PDF document.
 *
 * Page 1 — Snapshot: hero image, DH Score, key facts, narrative, scenarios, locality
 * Page 2 — Analysis: sensitivity grid, risk register, tax breakdown, diligence checklist
 *
 * Server-rendered via @react-pdf/renderer in the /api/properties/[id]/memo route.
 */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Signals, SignalExplanations } from "@/lib/scoring";
import type { FinancialModelResult } from "@/lib/financial-model";
import type { ScenarioSet } from "@/lib/scenarios";
import type { Locality } from "@/lib/locality";
import type { DiligenceItem } from "@/lib/diligence";
import type { SensitivityCell } from "@/lib/financial-model";

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
  warning: "#E8C77E",
  danger: "#D97757",
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    paddingBottom: 50,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontFamily: "Helvetica",
    fontSize: 9,
  },

  // ---- Header ----
  header: { marginBottom: 12, borderBottomColor: COLORS.gold, borderBottomWidth: 0.5, paddingBottom: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { color: COLORS.goldLight, fontSize: 8, letterSpacing: 2, textTransform: "uppercase" },
  pageTag: { color: COLORS.textDim, fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { fontSize: 16, color: COLORS.text, marginTop: 6, fontWeight: 500 },
  subtitle: { fontSize: 8, color: COLORS.textDim, marginTop: 2 },

  // ---- Hero image ----
  hero: {
    height: 130,
    marginBottom: 12,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPlaceholderText: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  heroBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: COLORS.bg,
    borderColor: COLORS.gold,
    borderWidth: 0.5,
    borderRadius: 2,
  },
  heroBadgeText: { color: COLORS.goldLight, fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase" },

  // ---- Two columns ----
  body: { flexDirection: "row", gap: 14 },
  leftCol: { flex: 1 },
  rightCol: { width: 180 },

  // ---- Section headers ----
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 7, color: COLORS.textDim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 },

  // ---- DH Score block ----
  scoreCard: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  scoreCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderColor: COLORS.gold,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: { fontSize: 20, color: COLORS.goldLight, fontWeight: 700 },
  scoreLabel: { fontSize: 6, color: COLORS.textDim, marginTop: 1 },
  signalsList: { flex: 1, gap: 4 },
  signalRow: {},
  signalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  signalLabel: { fontSize: 8, color: COLORS.text, fontWeight: 500 },
  signalScore: { fontSize: 7, color: COLORS.textDim },
  signalBar: { backgroundColor: COLORS.divider, height: 3, borderRadius: 1.5, marginTop: 1 },
  signalFill: { backgroundColor: COLORS.gold, height: 3, borderRadius: 1.5 },

  // ---- Property facts ----
  factsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  factCell: { width: "50%", marginBottom: 8 },
  factLabel: { fontSize: 6, color: COLORS.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 1 },
  factValue: { fontSize: 10, color: COLORS.text, fontWeight: 500 },
  factValuePrimary: { fontSize: 12, color: COLORS.goldLight, fontWeight: 700 },
  factValueSuccess: { fontSize: 10, color: COLORS.success, fontWeight: 500 },

  // ---- Narrative ----
  narrative: {
    backgroundColor: COLORS.bgAlt,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 10,
    marginTop: 3,
  },
  narrativePara: { fontSize: 8.5, color: COLORS.text, lineHeight: 1.55, marginBottom: 5 },

  // ---- Right sidebar cards ----
  sidebarCard: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  sidebarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  sidebarKey: { fontSize: 7, color: COLORS.textDim },
  sidebarVal: { fontSize: 7, color: COLORS.text, fontWeight: 500 },

  kpiCard: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.gold,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
    alignItems: "center",
  },
  kpiLabel: { fontSize: 6, color: COLORS.textDim, letterSpacing: 1, textTransform: "uppercase" },
  kpiValue: { fontSize: 16, color: COLORS.goldLight, fontWeight: 700, marginTop: 2 },

  // ---- Scenarios ----
  scenarioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomColor: COLORS.divider,
    borderBottomWidth: 0.3,
  },
  scenarioLabel: { fontSize: 8, fontWeight: 700 },
  scenarioStat: { fontSize: 8, color: COLORS.textDim },
  scenarioStatHi: { fontSize: 8, color: COLORS.goldLight, fontWeight: 700 },

  // ---- Locality ----
  localityRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  localityKey: { fontSize: 7, color: COLORS.textDim },
  localityName: { fontSize: 7, color: COLORS.text },
  localityKm: { fontSize: 7, color: COLORS.goldLight, fontWeight: 700 },

  // ---- Page 2: Sensitivity table ----
  sensTable: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 8,
  },
  sensRow: { flexDirection: "row", alignItems: "center" },
  sensHeaderCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 7,
    color: COLORS.textDim,
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    borderBottomColor: COLORS.divider,
    borderBottomWidth: 0.5,
  },
  sensCornerCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 6,
    color: COLORS.gold,
    textAlign: "center",
  },
  sensRowLabel: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 7,
    color: COLORS.textDim,
    textAlign: "center",
  },
  sensCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  sensCellIrr: { fontSize: 10, color: COLORS.goldLight, fontWeight: 700 },
  sensCellMoic: { fontSize: 6, color: COLORS.textDim, marginTop: 1 },

  // ---- Risk register ----
  riskCard: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  riskSeverity: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
  },
  riskBody: { flex: 1 },
  riskTitle: { fontSize: 8.5, color: COLORS.text, fontWeight: 700, marginBottom: 2 },
  riskDetail: { fontSize: 7.5, color: COLORS.textDim, lineHeight: 1.4 },
  riskSeverityTag: {
    fontSize: 6,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginLeft: 6,
  },

  // ---- Tax breakdown ----
  taxTable: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.divider,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 8,
  },
  taxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomColor: COLORS.divider,
    borderBottomWidth: 0.3,
  },
  taxRowLast: { paddingTop: 5, marginTop: 3, borderTopColor: COLORS.gold, borderTopWidth: 0.5 },
  taxKey: { fontSize: 7.5, color: COLORS.textDim },
  taxVal: { fontSize: 7.5, color: COLORS.text },
  taxValHi: { fontSize: 9, color: COLORS.goldLight, fontWeight: 700 },

  // ---- Diligence checklist ----
  diligenceItem: {
    backgroundColor: COLORS.bgAlt,
    borderColor: COLORS.divider,
    borderWidth: 0.3,
    borderLeftColor: COLORS.gold,
    borderLeftWidth: 1.5,
    borderRadius: 2,
    padding: 6,
    marginBottom: 4,
  },
  diligenceNum: { fontSize: 6, color: COLORS.goldDark, letterSpacing: 1, fontWeight: 700 },
  diligenceTitle: { fontSize: 8, color: COLORS.text, fontWeight: 700, marginTop: 1 },
  diligenceWhy: { fontSize: 7, color: COLORS.textDim, lineHeight: 1.35, marginTop: 1 },

  // ---- Counter-thesis (L) ----
  counterCard: {
    backgroundColor: COLORS.bgAlt,
    borderColor: COLORS.danger,
    borderLeftColor: COLORS.danger,
    borderLeftWidth: 2,
    borderWidth: 0.3,
    borderRadius: 3,
    padding: 8,
    marginBottom: 6,
  },
  counterPara: { fontSize: 8, color: COLORS.text, lineHeight: 1.55 },

  // ---- Change my mind (G) ----
  changeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  changeBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.warning,
    marginTop: 5,
  },
  changeText: { flex: 1, fontSize: 7.5, color: COLORS.text, lineHeight: 1.4 },

  // ---- Footer ----
  footer: {
    position: "absolute",
    bottom: 22,
    left: 28,
    right: 28,
    borderTopColor: COLORS.divider,
    borderTopWidth: 0.5,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 6, color: COLORS.textDim },
});

function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `Rs ${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `Rs ${(n / 1_00_000).toFixed(1)} L`;
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

export type Risk = {
  title: string;
  severity: "low" | "medium" | "high";
  detail: string;
};

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
    heroImageUrl: string | null;
  };
  signals: Signals | null;
  explanations: SignalExplanations | null;
  financial: FinancialModelResult;
  narrative: string[];
  scenarios: ScenarioSet;
  sensitivity: SensitivityCell[][];
  locality: Locality;
  diligence: DiligenceItem[];
  risks: Risk[];
  counterThesis: string;
  changeMyMind: string[];
};

const SIGNALS_META: { key: keyof Signals; label: string; weight: number }[] = [
  { key: "discountScore", label: "Discount", weight: 35 },
  { key: "titleScore", label: "Title Health", weight: 20 },
  { key: "possessionScore", label: "Possession", weight: 15 },
  { key: "liquidityScore", label: "Liquidity", weight: 20 },
  { key: "renovationScore", label: "Renovation Lift", weight: 10 },
];

const SEVERITY_COLOR: Record<Risk["severity"], string> = {
  low: COLORS.success,
  medium: COLORS.warning,
  high: COLORS.danger,
};

function PageHeader({ pageTag, property }: { pageTag: string; property: MemoData["property"] }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.brand}>DistressHub · Investor Memo</Text>
        <Text style={styles.pageTag}>{pageTag} · {formatDate(new Date())}</Text>
      </View>
      <Text style={styles.title}>{property.title}</Text>
      <Text style={styles.subtitle}>
        {property.address} · {property.city}, {property.state} · {property.bank} · {property.source}
      </Text>
    </View>
  );
}

function PageFooter({ property }: { property: MemoData["property"] }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        distresshub-zor1.vercel.app · {property.source} listing {property.id.slice(0, 8)}
      </Text>
      <Text style={styles.footerText}>
        Not investment advice · For accredited investors only
      </Text>
    </View>
  );
}

function Hero({ property }: { property: MemoData["property"] }) {
  if (property.heroImageUrl) {
    return (
      <View style={styles.hero}>
        <Image src={property.heroImageUrl} style={styles.heroImage} />
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>
            DH Score · {property.dhScore ?? "—"} · {property.propertyType}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.hero}>
      <View style={styles.heroPlaceholder}>
        <Text style={styles.heroPlaceholderText}>{property.propertyType}</Text>
        <Text style={[styles.heroPlaceholderText, { fontSize: 7, marginTop: 4 }]}>
          {property.city}, {property.state}
        </Text>
      </View>
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>
          DH Score · {property.dhScore ?? "—"} · {property.propertyType}
        </Text>
      </View>
    </View>
  );
}

export function MemoDocument({ data }: { data: MemoData }) {
  const { property: p, signals, explanations, financial, narrative, scenarios, sensitivity, locality, diligence, risks, counterThesis, changeMyMind } = data;

  return (
    <Document>
      {/* ===================== PAGE 1: SNAPSHOT ===================== */}
      <Page size="A4" style={styles.page}>
        <PageHeader pageTag="Page 1 · Snapshot" property={p} />

        <Hero property={p} />

        <View style={styles.body}>
          {/* LEFT */}
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
                  {signals
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
                              <View style={[styles.signalFill, { width: `${v}%` }]} />
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
            <View style={[styles.section, { marginTop: 2 }]}>
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

          {/* RIGHT */}
          <View style={styles.rightCol}>
            {/* KPI cards */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Projected IRR</Text>
              <Text style={styles.kpiValue}>{formatPct(financial.irr)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>MOIC</Text>
              <Text style={styles.kpiValue}>{financial.moic.toFixed(2)}x</Text>
            </View>

            {/* Scenarios (J) */}
            <Text style={styles.sectionTitle}>Bull · Base · Bear</Text>
            <View style={styles.sidebarCard}>
              {(["bull", "base", "bear"] as const).map((key) => {
                const s = scenarios[key];
                const color =
                  key === "bull" ? COLORS.success : key === "bear" ? COLORS.danger : COLORS.goldLight;
                return (
                  <View key={key} style={styles.scenarioRow}>
                    <Text style={[styles.scenarioLabel, { color }]}>{s.label}</Text>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.scenarioStatHi}>
                        {formatPct(s.result.irr, 0)} · {s.result.moic.toFixed(2)}x
                      </Text>
                      <Text style={styles.scenarioStat}>
                        {s.result.inputs.holdMonths}mo hold
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Locality (K) */}
            <Text style={styles.sectionTitle}>Locality</Text>
            <View style={styles.sidebarCard}>
              {locality.airportName ? (
                <View style={styles.localityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.localityKey}>Airport</Text>
                    <Text style={styles.localityName}>{locality.airportName}</Text>
                  </View>
                  <Text style={styles.localityKm}>{locality.airportKm} km</Text>
                </View>
              ) : null}
              {locality.cbdName ? (
                <View style={styles.localityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.localityKey}>Business district</Text>
                    <Text style={styles.localityName}>{locality.cbdName}</Text>
                  </View>
                  <Text style={styles.localityKm}>{locality.cbdKm} km</Text>
                </View>
              ) : null}
              {locality.itHubName ? (
                <View style={styles.localityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.localityKey}>IT corridor</Text>
                    <Text style={styles.localityName}>{locality.itHubName}</Text>
                  </View>
                  <Text style={styles.localityKm}>{locality.itHubKm} km</Text>
                </View>
              ) : null}
              {!locality.airportName && !locality.cbdName && (
                <Text style={[styles.localityKey, { textAlign: "center" }]}>
                  Coordinates pending
                </Text>
              )}
            </View>

            {/* Signal detail */}
            <Text style={styles.sectionTitle}>Signal Detail</Text>
            <View style={styles.sidebarCard}>
              {explanations
                ? SIGNALS_META.slice(0, 3).map(({ key, label }) => (
                    <View key={key} style={{ marginBottom: 4 }}>
                      <Text style={[styles.sidebarKey, { fontWeight: 700, color: COLORS.text }]}>
                        {label}
                      </Text>
                      <Text style={[styles.sidebarKey, { marginTop: 1, lineHeight: 1.35 }]}>
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

        <PageFooter property={p} />
      </Page>

      {/* ===================== PAGE 2: ANALYSIS ===================== */}
      <Page size="A4" style={styles.page}>
        <PageHeader pageTag="Page 2 · Analysis" property={p} />

        <View style={{ flexDirection: "row", gap: 14 }}>
          {/* LEFT — Sensitivity + Risks */}
          <View style={{ flex: 1 }}>
            {/* Sensitivity grid (C) */}
            <Text style={styles.sectionTitle}>Sensitivity · IRR at hold × appreciation</Text>
            <View style={styles.sensTable}>
              <View style={styles.sensRow}>
                <Text style={styles.sensCornerCell}>Hold ↓ / Appr →</Text>
                {sensitivity[0].map((c, i) => (
                  <Text key={i} style={styles.sensHeaderCell}>{c.appreciationPct}% p.a.</Text>
                ))}
              </View>
              {sensitivity.map((row, i) => (
                <View key={i} style={styles.sensRow}>
                  <Text style={styles.sensRowLabel}>{row[0].holdMonths} mo</Text>
                  {row.map((c, j) => (
                    <View key={j} style={styles.sensCell}>
                      <Text style={styles.sensCellIrr}>{formatPct(c.irr, 0)}</Text>
                      <Text style={styles.sensCellMoic}>{c.moic.toFixed(2)}x</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {/* Risk register (D) */}
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectionTitle}>Risk Register</Text>
              {risks.length === 0 ? (
                <View style={styles.sidebarCard}>
                  <Text style={styles.sidebarKey}>
                    No specific risks flagged. Standard SARFAESI diligence applies.
                  </Text>
                </View>
              ) : (
                risks.map((r, i) => (
                  <View key={i} style={styles.riskCard}>
                    <View style={[styles.riskSeverity, { backgroundColor: SEVERITY_COLOR[r.severity] }]} />
                    <View style={styles.riskBody}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.riskTitle}>{r.title}</Text>
                        <Text
                          style={[
                            styles.riskSeverityTag,
                            {
                              backgroundColor: SEVERITY_COLOR[r.severity],
                              color: COLORS.bg,
                            },
                          ]}
                        >
                          {r.severity}
                        </Text>
                      </View>
                      <Text style={styles.riskDetail}>{r.detail}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* RIGHT — Tax + Diligence */}
          <View style={{ width: 220 }}>
            {/* Tax & charges (E) */}
            <Text style={styles.sectionTitle}>Tax & Charges</Text>
            <View style={styles.taxTable}>
              <View style={styles.taxRow}>
                <Text style={styles.taxKey}>Stamp duty ({financial.inputs.stampDutyPct}%)</Text>
                <Text style={styles.taxVal}>{formatINR(financial.tax.stampDuty)}</Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={styles.taxKey}>Registration ({financial.inputs.registrationPct}%)</Text>
                <Text style={styles.taxVal}>{formatINR(financial.tax.registrationFee)}</Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={styles.taxKey}>Legal / DD</Text>
                <Text style={styles.taxVal}>{formatINR(financial.tax.legalDd)}</Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={[styles.taxKey, { fontWeight: 700, color: COLORS.text }]}>
                  Total acq. taxes
                </Text>
                <Text style={[styles.taxVal, { fontWeight: 700 }]}>
                  {formatINR(financial.tax.totalAcquisitionTaxes)}
                </Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={styles.taxKey}>
                  {financial.tax.capitalGainsType} @ {financial.tax.capitalGainsRate}%
                </Text>
                <Text style={[styles.taxVal, { color: COLORS.danger }]}>
                  ({formatINR(financial.tax.capitalGainsTax)})
                </Text>
              </View>
              <View style={[styles.taxRow, styles.taxRowLast]}>
                <Text style={[styles.taxKey, { fontWeight: 700, color: COLORS.text }]}>
                  Net profit (after CGT)
                </Text>
                <Text style={styles.taxValHi}>{formatINR(financial.tax.netProfitAfterTax)}</Text>
              </View>
            </View>

            {/* Diligence (F) */}
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Diligence Checklist</Text>
            {diligence.map((d, i) => (
              <View key={i} style={styles.diligenceItem}>
                <Text style={styles.diligenceNum}>Step {i + 1} of {diligence.length}</Text>
                <Text style={styles.diligenceTitle}>{d.title}</Text>
                <Text style={styles.diligenceWhy}>{d.why}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Full-width row: Counter-thesis (L) + Change my mind (G) */}
        <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
          <View style={{ flex: 1.6 }}>
            <Text style={styles.sectionTitle}>Counter-Thesis · Why we'd pass</Text>
            <View style={styles.counterCard}>
              <Text style={styles.counterPara}>{counterThesis}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>What Would Change Our Mind</Text>
            <View style={styles.sidebarCard}>
              {changeMyMind.map((item, i) => (
                <View key={i} style={styles.changeItem}>
                  <View style={styles.changeBullet} />
                  <Text style={styles.changeText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <PageFooter property={p} />
      </Page>
    </Document>
  );
}

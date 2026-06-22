/**
 * Throwaway diagnostic — hits BAANKNET once and returns the raw response
 * (status, headers, first 500 chars of body) so we can see exactly what
 * Vercel's IP gets back. Bearer-gated like the real cron endpoint.
 */
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "no secret" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const targets = [
    {
      label: "baanknet root GET",
      url: "https://baanknet.com/",
      method: "GET",
      body: undefined as string | undefined,
    },
    {
      label: "baanknet API POST",
      url: "https://baanknet.com/eauction-psb/api/get-upcoming-auctions",
      method: "POST",
      body: JSON.stringify({ pageSize: 5, page: 0, propertyTypeId: 1 }),
    },
    {
      label: "httpbin control",
      url: "https://httpbin.org/ip",
      method: "GET",
      body: undefined as string | undefined,
    },
    {
      label: "ipify control",
      url: "https://api.ipify.org?format=json",
      method: "GET",
      body: undefined as string | undefined,
    },
  ];

  const results: Record<string, unknown>[] = [];

  for (const t of targets) {
    const started = Date.now();
    try {
      const res = await fetch(t.url, {
        method: t.method,
        headers: {
          "User-Agent": "Mozilla/5.0 DistressHubBot/1.0",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Origin: "https://baanknet.com",
          Referer: "https://baanknet.com/",
        },
        body: t.body,
      });
      const text = await res.text();
      results.push({
        label: t.label,
        status: res.status,
        elapsedMs: Date.now() - started,
        bodyLength: text.length,
        bodyPreview: text.slice(0, 200),
      });
    } catch (e) {
      results.push({
        label: t.label,
        error: String(e),
        elapsedMs: Date.now() - started,
      });
    }
  }

  return NextResponse.json({ results });
}

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

  const url = "https://baanknet.com/eauction-psb/api/get-upcoming-auctions";
  const body = JSON.stringify({ pageSize: 5, page: 0, propertyTypeId: 1 });
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 DistressHubBot/1.0",
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Origin: "https://baanknet.com",
        Referer: "https://baanknet.com/",
      },
      body,
    });

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k] = v;
    });

    const text = await res.text();

    return NextResponse.json({
      status: res.status,
      elapsedMs: Date.now() - started,
      headers,
      bodyLength: text.length,
      bodyPreview: text.slice(0, 800),
    });
  } catch (e) {
    return NextResponse.json({
      error: String(e),
      elapsedMs: Date.now() - started,
    });
  }
}

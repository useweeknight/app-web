import { NextResponse } from "next/server";

export async function GET() {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.SUPABASE_ANON_KEY!;
    // 只读取一条最小数据，流量极小
    const url = `${base}/rest/v1/keepalive?select=id`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        Accept: "application/json",
        // 只要第一条，返回 206 + very small body
        Range: "0-0",
        // 顺便要个 count，PostgREST 会在响应头里给 total，没正文开销
        Prefer: "count=exact",
      },
      // 避免 Vercel 边缘缓存
      cache: "no-store",
    });

    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

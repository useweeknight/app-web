import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(url, anon);

    const { error } = await supabase
      .from("keepalive")
      .select("*", { head: true, count: "exact" });

    if (error) throw error;
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

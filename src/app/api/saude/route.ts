import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * "O sistema está de pé e o banco responde?" — para monitor de uptime e para
 * um healthcheck do Dokploy (auditoria de 07/10/2026). Pública: não devolve
 * nada além de ok/erro.
 */
export async function GET() {
  try {
    await db.run(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  const map = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    map[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  let key = map.SUPABASE_SERVICE_ROLE_KEY || "";
  if (key.startsWith("=")) key = key.slice(1);
  return { url: map.NEXT_PUBLIC_SUPABASE_URL, key };
}

const { url, key } = loadEnv();
const sup = createClient(url, key, { auth: { persistSession: false } });

const { data: guilds, error: gErr } = await sup.from("guilds").select("id,name").order("id").limit(5);
if (gErr) {
  console.error("guilds error:", gErr.message);
  process.exit(1);
}
console.log("✓ guild_ranking_targets table reachable");
console.log("  sample guilds:", guilds.map((g) => `${g.id}:${g.name}`).join(", "));

const guildId = guilds[0].id;
const content = "공성전";
const week = "2026-05-26";

const payload = {
  guild_id: guildId,
  content_name: content,
  week_monday: week,
  target_score: 9876543,
  target_rank: 2,
  updated_at: new Date().toISOString(),
};

const { data: upserted, error: uErr } = await sup
  .from("guild_ranking_targets")
  .upsert(payload, { onConflict: "guild_id,content_name,week_monday" })
  .select()
  .maybeSingle();

if (uErr) {
  console.error("upsert failed:", uErr.message);
  process.exit(1);
}
console.log("✓ upsert OK", upserted);

const { data: fetched, error: fErr } = await sup
  .from("guild_ranking_targets")
  .select("*")
  .eq("guild_id", guildId)
  .eq("content_name", content)
  .eq("week_monday", week)
  .maybeSingle();

if (fErr || !fetched || Number(fetched.target_score) !== payload.target_score) {
  console.error("fetch failed:", fErr?.message, fetched);
  process.exit(1);
}
console.log("✓ fetch after upsert OK (simulates refresh load)");

const { count } = await sup
  .from("guild_ranking_targets")
  .select("*", { count: "exact", head: true });
console.log("✓ table row count (head):", count);

await sup.from("guild_ranking_targets").delete().eq("id", upserted.id);

const { count: after } = await sup
  .from("guild_ranking_targets")
  .select("*", { count: "exact", head: true });
console.log("✓ cleanup test row OK; remaining rows:", after);

console.log("\nAll DB checks passed.");

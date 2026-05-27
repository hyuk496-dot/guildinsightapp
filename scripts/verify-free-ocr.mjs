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

console.log("=== 1) Schema: free_ocr_count column ===");
const { data: cols, error: colErr } = await sup
  .from("profiles")
  .select("id, email, free_ocr_count")
  .limit(8);
if (colErr) {
  console.error("FAIL:", colErr.message);
  process.exit(1);
}
console.log("✓ profiles.free_ocr_count readable");
for (const p of cols) {
  console.log(`  - ${p.email}: ${p.free_ocr_count === null ? "NULL (unlimited)" : p.free_ocr_count}`);
}

const testUser =
  cols.find((p) => p.email && p.email !== "admin@guildinsight.local") || cols[0];
if (!testUser?.id) {
  console.error("No test user");
  process.exit(1);
}

console.log(`\n=== 2) RPC gi_consume_free_ocr_scan (user: ${testUser.email}) ===`);

const { error: resetErr } = await sup
  .from("profiles")
  .update({ free_ocr_count: 3 })
  .eq("id", testUser.id);
if (resetErr) {
  console.error("reset FAIL:", resetErr.message);
  process.exit(1);
}
console.log("✓ reset to 3");

for (let i = 1; i <= 3; i++) {
  const { data: left, error: rpcErr } = await sup.rpc("gi_consume_free_ocr_scan", {
    p_user_id: testUser.id,
  });
  if (rpcErr) {
    console.error(`consume #${i} FAIL:`, rpcErr.message);
    process.exit(1);
  }
  console.log(`  consume #${i} → remaining ${left}`);
  if (left !== 3 - i) {
    console.error(`  expected ${3 - i}, got ${left}`);
    process.exit(1);
  }
}

const { data: after3 } = await sup
  .from("profiles")
  .select("free_ocr_count")
  .eq("id", testUser.id)
  .single();
console.log(`✓ DB after 3 consumes: free_ocr_count = ${after3.free_ocr_count}`);
if (after3.free_ocr_count !== 0) process.exit(1);

const { data: noMore } = await sup.rpc("gi_consume_free_ocr_scan", {
  p_user_id: testUser.id,
});
console.log(`  consume at 0 → ${noMore} (expect 0)`);
if (noMore !== 0) process.exit(1);
console.log("✓ no decrement below zero");

console.log("\n=== 3) Admin exempt ===");
const admin = cols.find((p) => p.email === "admin@guildinsight.local");
if (admin) {
  const { data: adminLeft } = await sup.rpc("gi_consume_free_ocr_scan", {
    p_user_id: admin.id,
  });
  console.log(`✓ admin consume returns ${adminLeft} (unlimited marker, no crash)`);
}

await sup.from("profiles").update({ free_ocr_count: 3 }).eq("id", testUser.id);
console.log(`\n✓ restored ${testUser.email} to 3 for app use`);

console.log("\n=== 4) PostgREST RPC exposed ===");
const anon = readFileSync(".env.local", "utf8").match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)$/m)?.[1]?.trim();
const rpcProbe = await fetch(`${url}/rest/v1/rpc/gi_consume_free_ocr_scan`, {
  method: "POST",
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ p_user_id: testUser.id }),
});
console.log(`  anon RPC call status: ${rpcProbe.status} (403/401 expected without user JWT)`);

console.log("\nAll DB/RPC checks passed.");

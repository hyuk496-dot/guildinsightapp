export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/ocr-quota";

function isValidDiscordWebhookUrl(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  return /^https:\/\/(ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/i.test(u);
}

function clampEmbedText(v, max = 1024) {
  const s = String(v ?? "").trim();
  if (s.length <= max) return s || "—";
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function sectionEmoji(title) {
  const t = String(title || "");
  if (t.includes("성과") || t.includes("요약") || t.includes("📊")) return "📊";
  if (t.includes("MVP") || t.includes("🔥")) return "🔥";
  if (t.includes("개선") || t.includes("⚠")) return "⚠️";
  if (t.includes("전략") || t.includes("🎯")) return "🎯";
  return "✦";
}

function normalizeContentLabel(contentFilter) {
  const cf = String(contentFilter || "전체");
  if (cf === "전체") return "📊 전체 통합 기준";
  return `⚡ ${cf} 기준`;
}

export async function POST(request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const isAdmin = user.email === ADMIN_EMAIL;
  if (!isAdmin) {
    return NextResponse.json(
      { error: "해당 기능은 PRO 구독자 전용 기능입니다. 정식 결제 후 이용해 주세요." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const reportId = body?.reportId != null ? Number(body.reportId) : null;
  const guildId = body?.guildId != null ? Number(body.guildId) : null;
  const content = String(body?.content || "총력전");
  const contentFilter = String(body?.contentFilter || "전체");
  if (!guildId || !Number.isFinite(guildId)) {
    return NextResponse.json({ error: "guildId 필요" }, { status: 400 });
  }

  // Webhook URL은 profiles(본인 행)에 저장
  const { data: profile } = await supabase
    .from("profiles")
    .select("discord_webhook_url")
    .eq("id", user.id)
    .maybeSingle();

  const webhookUrl = profile?.discord_webhook_url || "";
  if (!isValidDiscordWebhookUrl(webhookUrl)) {
    return NextResponse.json(
      { error: "Discord Webhook URL이 설정되어 있지 않습니다. (프로필/설정에서 저장)" },
      { status: 400 }
    );
  }

  // 길드 접근권한 확인 (RLS)
  const { data: guildRow } = await supabase
    .from("guilds")
    .select("id, name, game_name")
    .eq("id", guildId)
    .maybeSingle();

  if (!guildRow) {
    return NextResponse.json(
      { error: "접근 권한이 없거나 존재하지 않는 길드입니다." },
      { status: 403 }
    );
  }

  // gpt_reports에서 실제 AI 리포트 내용(섹션 포함)을 가져온다.
  let report = null;
  if (reportId && Number.isFinite(reportId)) {
    const { data } = await supabase
      .from("gpt_reports")
      .select("*")
      .eq("id", reportId)
      .eq("guild_id", guildId)
      .maybeSingle();
    report = data;
  } else {
    let q = supabase
      .from("gpt_reports")
      .select("*")
      .eq("guild_id", guildId)
      .order("created_at", { ascending: false })
      .limit(1);
    // 화면 선택이 전체가 아니면 content_filter로 좁힘
    if (contentFilter && contentFilter !== "전체") {
      q = q.eq("content_filter", contentFilter);
    }
    const { data } = await q.maybeSingle();
    report = data;
  }

  if (!report) {
    return NextResponse.json(
      { error: "공유할 리포트를 찾을 수 없습니다. /gptreport에서 리포트를 먼저 생성/선택해 주세요." },
      { status: 404 }
    );
  }

  const metrics = report.metrics || {};
  const weekLabel = metrics.weekLabel || metrics.weekMonday || report.date || "";
  const currentTotal = metrics.currentTotal ?? null;
  const delta = metrics.delta ?? null;
  const deltaPct = metrics.deltaPct ?? null;
  const participation = metrics.participation ?? null;
  const mvp = metrics.mvp?.nick ? `${metrics.mvp.nick}${metrics.mvp.score ? ` (${metrics.mvp.score}점)` : ""}` : "—";

  const sections = Array.isArray(report.sections) ? report.sections : [];
  const contentLabel = normalizeContentLabel(report.content_filter || contentFilter);
  const title = report.title || `GPT 주간 리포트 · ${guildRow.name}`;

  const embedOverview = {
    title: `✦ ${title}`,
    description: `${contentLabel}\n길드: **${guildRow.name}**`,
    color: 0x00c8ff,
    fields: [
      { name: "주차", value: clampEmbedText(weekLabel || "—", 1024), inline: true },
      {
        name: "주간 합계",
        value:
          currentTotal != null
            ? `\`${Number(currentTotal).toLocaleString()}점\``
            : "—",
        inline: true,
      },
      {
        name: "전주 대비",
        value:
          delta != null
            ? `**${Number(delta) >= 0 ? "▲" : "▼"} ${Math.abs(Number(delta)).toLocaleString()}** (${deltaPct ?? "0"}%)`
            : "—",
        inline: true,
      },
      {
        name: "참여율",
        value: participation != null ? `**${participation}%**` : "—",
        inline: true,
      },
      { name: "MVP", value: clampEmbedText(mvp, 1024), inline: true },
      {
        name: "요약",
        value: clampEmbedText(report.summary || "—", 1024),
        inline: false,
      },
    ],
    footer: { text: "Guild Insight · Discord Webhook" },
    timestamp: new Date().toISOString(),
  };

  // 섹션 4종(성과/MVP/개선/전략)을 Embed fields로 구성
  const wantedOrder = ["성과", "MVP", "개선", "전략"];
  const sectionFields = [];
  for (const key of wantedOrder) {
    const found = sections.find((s) => String(s?.title || "").includes(key));
    if (!found) continue;
    const emoji = sectionEmoji(found.title);
    const name = `${emoji} ${String(found.title || key).replace(/\s+/g, " ").trim()}`;
    const value = clampEmbedText(found.content || "—", 1024);
    sectionFields.push({ name, value, inline: false });
  }
  // 나머지 섹션도 있으면 뒤에 추가(최대 10개 내)
  for (const sec of sections) {
    if (sectionFields.length >= 10) break;
    const t = String(sec?.title || "");
    if (!t) continue;
    if (wantedOrder.some((k) => t.includes(k))) continue;
    const emoji = sectionEmoji(t);
    sectionFields.push({
      name: `${emoji} ${t.replace(/\s+/g, " ").trim()}`,
      value: clampEmbedText(sec?.content || "—", 1024),
      inline: false,
    });
  }

  const embedSections = {
    title: "📌 상세 분석",
    description: "아래 섹션은 리포트 본문에서 발췌한 내용입니다.",
    color: 0x00c8ff,
    fields: sectionFields.length ? sectionFields : [{ name: "섹션", value: "섹션 데이터가 없습니다.", inline: false }],
  };

  const payload = { embeds: [embedOverview, embedSections] };

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: `Webhook 전송 실패 (${resp.status}) ${text}`.slice(0, 500) },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}


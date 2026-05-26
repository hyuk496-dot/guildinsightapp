'use client';

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGuildInsight } from "@/context/GuildInsightProvider";

export const dynamic = "force-dynamic";

const GAMES = [
  "리니지M",
  "리니지W",
  "오딘",
  "원신",
  "메이플스토리M",
  "기타",
];
const OTHER = "기타";

function NewGuildInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isWelcome = params.get("welcome") === "1";

  const { t, guilds, addGuild, refreshGuilds, selectGuild } = useGuildInsight();
  // 길드를 한 번도 만들지 않은 신규 유저는 취소가 불가 (강제 생성 흐름)
  const mustCreate = (guilds?.length ?? 0) === 0;

  const [name, setName] = useState("");
  const [game, setGame] = useState(GAMES[0]);
  const [customGame, setCustomGame] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const resolvedGame =
    game === OTHER ? customGame.trim() : game;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) {
      setError("길드 이름을 입력해 주세요.");
      return;
    }
    if (game === OTHER && !customGame.trim()) {
      setError("게임 이름을 직접 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await addGuild(name.trim(), resolvedGame);
      await refreshGuilds();
      selectGuild(created);
      router.replace("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err?.message || "길드 생성에 실패했습니다.");
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: t.bg,
        color: t.text,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 28,
          background: t.bgCard,
          border: `1px solid ${t.borderSubtle || "rgba(255,255,255,0.08)"}`,
          borderRadius: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        }}
      >
        {isWelcome && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(0,200,255,0.07)",
              border: "1px solid rgba(0,200,255,0.25)",
              color: "#7bdcff",
              fontSize: 12,
              lineHeight: 1.6,
              marginBottom: 18,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>환영합니다!</div>
            서비스를 이용하기 위해 먼저 <strong>길드를 생성</strong>해 주세요. 생성한 길드의
            데이터는 본인 계정에만 귀속되며, 다른 사용자의 길드와 완전히 분리됩니다.
          </div>
        )}

        <div
          style={{
            fontSize: 11,
            color: t.textSub,
            letterSpacing: "0.18em",
            marginBottom: 6,
          }}
        >
          NEW GUILD
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 22, color: t.text }}>
          새 길드 생성
        </div>

        <form onSubmit={submit}>
          <label
            style={{ display: "block", fontSize: 11, color: t.textSub, marginBottom: 6 }}
          >
            길드 이름
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 그림자 군단"
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              borderRadius: 8,
              background: t.bgInput || "rgba(255,255,255,0.04)",
              color: t.text,
              border: `1px solid ${t.border || "rgba(255,255,255,0.12)"}`,
              outline: "none",
              marginBottom: 16,
              fontFamily: "inherit",
            }}
          />

          <label
            style={{ display: "block", fontSize: 11, color: t.textSub, marginBottom: 6 }}
          >
            대표 게임
          </label>
          <select
            value={game}
            onChange={(e) => setGame(e.target.value)}
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              borderRadius: 8,
              background: "#ffffff",
              color: "#0b3b6b",
              border: `1px solid ${t.border || "rgba(255,255,255,0.12)"}`,
              outline: "none",
              marginBottom: game === OTHER ? 10 : 22,
              fontFamily: "inherit",
            }}
          >
            {GAMES.map((g) => (
              <option key={g} value={g} style={{ color: "#0b3b6b", background: "#fff" }}>
                {g}
              </option>
            ))}
          </select>

          {game === OTHER && (
            <>
              <label
                style={{ display: "block", fontSize: 11, color: t.textSub, marginBottom: 6 }}
              >
                게임 이름 직접 입력
              </label>
              <input
                value={customGame}
                onChange={(e) => setCustomGame(e.target.value)}
                placeholder="예: 검은사막 모바일"
                disabled={saving}
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  background: t.bgInput || "rgba(255,255,255,0.04)",
                  color: t.text,
                  border: `1px solid ${t.border || "rgba(255,255,255,0.12)"}`,
                  outline: "none",
                  marginBottom: 8,
                  fontFamily: "inherit",
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  color: t.textMuted,
                  marginBottom: 22,
                  lineHeight: 1.6,
                }}
              >
                같은 게임명을 입력한 다른 길드들이 이미 등록되어 있다면, 대시보드의
                <strong style={{ color: t.accent }}> 서버 랭킹</strong> 에서 동일 게임 풀로
                묶여 함께 표시됩니다.
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                fontSize: 11,
                color: "#ff8585",
                background: "rgba(255,80,80,0.08)",
                border: "1px solid rgba(255,80,80,0.3)",
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          {mustCreate && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 10.5,
                color: t.textMuted,
                lineHeight: 1.6,
                padding: "8px 10px",
                background: "rgba(255,255,255,0.02)",
                border: `1px dashed ${t.border || "rgba(255,255,255,0.12)"}`,
                borderRadius: 8,
              }}
            >
              ℹ 길드를 생성해야 대시보드 · 길드원 관리 · 점수 관리 등 모든 메뉴를 이용할 수 있어요.
              생성 전에는 [취소] 가 비활성화됩니다.
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {!mustCreate && (
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                disabled={saving}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  color: t.textSub,
                  border: `1px solid ${t.border || "rgba(255,255,255,0.15)"}`,
                  borderRadius: 8,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                }}
              >
                취소
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: "10px 18px",
                background: saving
                  ? "rgba(0,200,255,0.15)"
                  : "linear-gradient(135deg, #00c8ff 0%, #0090d4 100%)",
                color: "#001827",
                border: "1px solid #00c8ff",
                borderRadius: 8,
                cursor: saving ? "wait" : "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              {saving ? "생성 중..." : "✦ 길드 생성하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewGuildPage() {
  return (
    <Suspense fallback={null}>
      <NewGuildInner />
    </Suspense>
  );
}

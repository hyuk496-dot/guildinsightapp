'use client';

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { buildGuildRadar } from "@/lib/dashboard-aggregations";

function RadarTooltip({ active, payload, t }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div
      style={{
        background: t.bgCard,
        border: `1px solid ${t.borderStrong}`,
        borderRadius: 8,
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        fontSize: 11,
        color: t.text,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        minWidth: 130,
      }}
    >
      <div style={{ fontWeight: 600, color: t.accent, marginBottom: 4 }}>{d.axis}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 2, columnGap: 8 }}>
        <span style={{ color: t.textMuted }}>능력치</span>
        <span style={{ color: t.up }}>{d.value}%</span>
        <span style={{ color: t.textMuted }}>참여 인원</span>
        <span style={{ color: t.text }}>{d.participants}명</span>
        <span style={{ color: t.textMuted }}>평균 점수</span>
        <span style={{ color: t.text }}>{d.avgScore.toLocaleString()}</span>
        <span style={{ color: t.textMuted }}>만점</span>
        <span style={{ color: t.textMuted }}>{d.maxScore?.toLocaleString?.() || "—"}</span>
      </div>
    </div>
  );
}

export function GuildRadarChart({ t, members, scoresByContent, contents }) {
  const data = buildGuildRadar({ members, scoresByContent, contents });
  const hasData = data.some((d) => d.value > 0);

  return (
    <div
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 11,
        padding: "14px 16px",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>
          길드 능력치 레이더
          <span
            style={{
              fontSize: 10,
              color: t.textMuted,
              fontWeight: 400,
              marginLeft: 6,
            }}
          >
            컨텐츠별 참여 멤버 평균 (만점 대비 %)
          </span>
        </div>
      </div>

      <div style={{ width: "100%", height: 240 }}>
        {!hasData ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: t.textMuted,
            }}
          >
            점수 데이터가 아직 없어요. 점수 관리에서 입력하면 자동으로 채워집니다.
          </div>
        ) : (
          <ResponsiveContainer>
            <RadarChart cx="50%" cy="50%" outerRadius="78%" data={data}>
              <PolarGrid stroke={t.chartGrid} />
              <PolarAngleAxis
                dataKey="axis"
                tick={{
                  fill: t.accentDim || t.chartLabel,
                  fontSize: 10,
                  fontFamily: "'Courier New',monospace",
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{
                  fill: t.textMuted,
                  fontSize: 8,
                  fontFamily: "'Courier New',monospace",
                }}
                stroke={t.chartGrid}
                tickCount={5}
              />
              <Radar
                name="길드 평균"
                dataKey="value"
                stroke={t.accent}
                fill={t.accent}
                fillOpacity={0.18}
                strokeWidth={1.5}
                dot={{ r: 2.5, fill: t.accent, stroke: t.accent }}
              />
              <Tooltip content={<RadarTooltip t={t} />} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

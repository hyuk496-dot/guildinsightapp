'use client';

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
} from "recharts";
import { buildContribScatter } from "@/lib/dashboard-aggregations";

function CustomTooltip({ active, payload, t }) {
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
        minWidth: 140,
      }}
    >
      <div style={{ fontWeight: 600, color: d.color || t.accent, marginBottom: 4 }}>
        {d.nick}{" "}
        <span
          style={{
            fontSize: 9,
            color: t.textMuted,
            marginLeft: 4,
            fontWeight: 400,
          }}
        >
          {d.job}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 2, columnGap: 8 }}>
        <span style={{ color: t.textMuted }}>참여 컨텐츠</span>
        <span style={{ color: t.text }}>{d.contentsCount}</span>
        <span style={{ color: t.textMuted }}>총점</span>
        <span style={{ color: t.up }}>{d.totalScore.toLocaleString()}</span>
        <span style={{ color: t.textMuted }}>평균</span>
        <span style={{ color: t.accent }}>{d.avgScore.toLocaleString()}</span>
        <span style={{ color: t.textMuted }}>등급</span>
        <span style={{ color: t.accent, fontWeight: 600 }}>{d.grade}</span>
      </div>
    </div>
  );
}

export function ContribScatterChart({ t, members, scoresByContent }) {
  const data = buildContribScatter({ members, scoresByContent, theme: t });
  const hasData = data.some((d) => d.y > 0);

  // 직업별로 그룹화 — Scatter 시리즈가 색을 가질 수 있도록
  const byJob = {};
  data.forEach((d) => {
    (byJob[d.job] ??= { color: d.color, points: [] }).points.push(d);
  });

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
          기여도 산점도
          <span
            style={{
              fontSize: 10,
              color: t.textMuted,
              fontWeight: 400,
              marginLeft: 6,
            }}
          >
            X: 참여 컨텐츠 수 / Y: 총점
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {Object.entries(byJob).map(([job, group]) => (
            <div
              key={job}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 9,
                color: t.textSub,
                padding: "2px 8px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${t.border}`,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: group.color,
                }}
              />
              {job}
              <span style={{ color: t.textMuted, fontSize: 9 }}>·{group.points.length}</span>
            </div>
          ))}
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
            <ScatterChart margin={{ top: 8, right: 16, bottom: 22, left: 4 }}>
              <CartesianGrid stroke={t.chartGrid} strokeDasharray="2 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="참여 컨텐츠"
                stroke={t.chartLabel}
                tick={{ fill: t.chartLabel, fontSize: 9, fontFamily: "'Courier New',monospace" }}
                tickLine={{ stroke: t.chartGrid }}
                axisLine={{ stroke: t.chartGrid }}
                allowDecimals={false}
                domain={[0, "dataMax + 1"]}
                label={{
                  value: "참여 컨텐츠 수",
                  position: "insideBottom",
                  offset: -10,
                  fill: t.chartLabel,
                  fontSize: 9,
                  fontFamily: "'Courier New',monospace",
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="총점"
                stroke={t.chartLabel}
                tick={{ fill: t.chartLabel, fontSize: 9, fontFamily: "'Courier New',monospace" }}
                tickLine={{ stroke: t.chartGrid }}
                axisLine={{ stroke: t.chartGrid }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v
                }
              />
              <ZAxis dataKey="z" range={[60, 360]} />
              <Tooltip
                cursor={{ stroke: t.accent, strokeOpacity: 0.25 }}
                content={<CustomTooltip t={t} />}
              />
              {Object.entries(byJob).map(([job, group]) => (
                <Scatter
                  key={job}
                  name={job}
                  data={group.points}
                  fill={group.color}
                  stroke={group.color}
                  strokeWidth={1}
                  fillOpacity={0.55}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

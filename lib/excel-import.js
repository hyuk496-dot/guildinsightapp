/**
 * 클라이언트 엑셀 업로드 → OCR 행 포맷 변환
 */

const HEADER_PATTERNS = {
  rank: /^(순위|rank|#|no\.?|번호|등수)$/i,
  nick: /^(닉네임|닉|name|member|member_name|캐릭터|이름|nick|유저|캐릭|캐릭터명)$/i,
  serverGuild: /^(길드|소속|guild|guild_name|server|소속길드|길드명)$/i,
  weekly: /^(점수|score|기여|weekly|contrib|공헌|공헌도|주간|누적점수|획득)$/i,
};

export const EXCEL_DB_FIELDS = [
  { key: "rank", label: "순위", required: false },
  { key: "nick", label: "닉네임", required: true },
  { key: "serverGuild", label: "소속길드", required: false },
  { key: "weekly", label: "점수", required: true },
];

const SKIP_VALUE = "(매핑 안 함)";

export function parseScoreCell(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  if (!cleaned) return 0;
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

export function parseRankCell(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const r = Math.round(value);
    return r >= 1 && r <= 999 ? r : null;
  }
  const m = String(value).trim().match(/^(\d{1,3})/);
  if (!m) return null;
  const r = parseInt(m[1], 10);
  return r >= 1 && r <= 999 ? r : null;
}

function normalizeHeaderCell(cell) {
  return String(cell ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function rowHasContent(row) {
  return (row || []).some((c) => String(c ?? "").trim() !== "");
}

function detectHeaderRowIndex(matrix) {
  for (let i = 0; i < Math.min(matrix.length, 15); i++) {
    const row = matrix[i] || [];
    if (!rowHasContent(row)) continue;
    const texts = row.filter((c) => {
      const s = String(c ?? "").trim();
      return s && Number.isNaN(Number(s.replace(/,/g, "")));
    });
    if (texts.length >= 2) return i;
  }
  return 0;
}

export function guessColumnMapping(headers) {
  const mapping = {
    rank: SKIP_VALUE,
    nick: SKIP_VALUE,
    serverGuild: SKIP_VALUE,
    weekly: SKIP_VALUE,
  };
  const used = new Set();

  for (const { key } of EXCEL_DB_FIELDS) {
    const pattern = HEADER_PATTERNS[key];
    for (const h of headers) {
      if (used.has(h)) continue;
      const norm = h.replace(/\s/g, "");
      if (pattern.test(h) || pattern.test(norm)) {
        mapping[key] = h;
        used.add(h);
        break;
      }
    }
  }

  // 닉네임/점수 미매칭 시: 남은 헤더 휴리스틱
  if (mapping.nick === SKIP_VALUE) {
    const rest = headers.filter((h) => !used.has(h));
    const nickCand = rest.find((h) => /닉|이름|name|nick/i.test(h));
    if (nickCand) {
      mapping.nick = nickCand;
      used.add(nickCand);
    }
  }
  if (mapping.weekly === SKIP_VALUE) {
    const rest = headers.filter((h) => !used.has(h));
    const scoreCand = rest.find((h) => /점|score|기여|숫/i.test(h));
    if (scoreCand) {
      mapping.weekly = scoreCand;
      used.add(scoreCand);
    }
  }

  return mapping;
}

/**
 * @param {File} file
 * @returns {Promise<{ headers: string[], dataRows: unknown[][], headerRowIndex: number, colIndexByHeader: Record<string, number> }>}
 */
export async function parseExcelFile(file) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error("엑셀 파일에 시트가 없습니다.");
  }
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!matrix.length) {
    throw new Error("엑셀 시트가 비어 있습니다.");
  }

  const headerRowIndex = detectHeaderRowIndex(matrix);
  const headerRow = matrix[headerRowIndex] || [];
  const maxCols = Math.max(
    headerRow.length,
    ...matrix.slice(headerRowIndex + 1).map((r) => (r || []).length),
    0
  );

  const headers = [];
  for (let c = 0; c < maxCols; c++) {
    const raw = normalizeHeaderCell(headerRow[c]);
    headers.push(raw || `열 ${c + 1}`);
  }

  // 데이터가 없는 끝 열 제거
  const trimmedHeaders = [];
  const keptIndices = [];
  for (let c = 0; c < headers.length; c++) {
    const hasData = matrix
      .slice(headerRowIndex + 1)
      .some((row) => String(row?.[c] ?? "").trim() !== "");
    if (hasData || normalizeHeaderCell(headerRow[c])) {
      trimmedHeaders.push(headers[c]);
      keptIndices.push(c);
    }
  }

  const dataRows = matrix
    .slice(headerRowIndex + 1)
    .filter(rowHasContent)
    .map((row) => keptIndices.map((ci) => row?.[ci] ?? ""));

  const colIndexByHeader = {};
  trimmedHeaders.forEach((h, i) => {
    if (colIndexByHeader[h] === undefined) colIndexByHeader[h] = i;
  });

  return {
    headers: trimmedHeaders,
    dataRows,
    headerRowIndex,
    colIndexByHeader,
  };
}

function getCellByHeader(row, headerLabel, colIndexByHeader) {
  if (!headerLabel || headerLabel === SKIP_VALUE) return null;
  const idx = colIndexByHeader[headerLabel];
  if (idx === undefined) return null;
  return row[idx];
}

/**
 * 매핑된 엑셀 행 → OCR parseRow 호환 객체 배열
 */
export function excelRowsToOcrFormat(dataRows, mapping, colIndexByHeader) {
  if (!mapping?.nick || mapping.nick === SKIP_VALUE) {
    throw new Error("닉네임 컬럼을 선택해 주세요.");
  }
  if (!mapping?.weekly || mapping.weekly === SKIP_VALUE) {
    throw new Error("점수 컬럼을 선택해 주세요.");
  }

  const out = [];

  for (const row of dataRows) {
    const nick = String(getCellByHeader(row, mapping.nick, colIndexByHeader) ?? "").trim();
    const weekly = parseScoreCell(
      getCellByHeader(row, mapping.weekly, colIndexByHeader)
    );
    const rank = parseRankCell(
      getCellByHeader(row, mapping.rank, colIndexByHeader)
    );
    const serverGuild = String(
      getCellByHeader(row, mapping.serverGuild, colIndexByHeader) ?? ""
    ).trim();

    if (!nick && weekly === 0) continue;

    let conf = 96;
    let warn = false;
    if (!nick) {
      warn = true;
      conf = 70;
    }
    if (weekly === 0) {
      warn = true;
      conf = Math.min(conf, 75);
    }

    out.push({
      rank,
      nick: nick || "(닉네임 없음)",
      serverGuild,
      weekly,
      accum: 0,
      job: "—",
      grade: "—",
      conf,
      warn,
      _raw: [nick, serverGuild, weekly].filter(Boolean).join(" "),
      _source: "excel",
    });
  }

  if (!out.length) {
    throw new Error("매핑 결과로 가져올 데이터 행이 없습니다. 컬럼 매핑을 확인해 주세요.");
  }

  return out.map((r, i) => ({
    ...r,
    id: `excel-${i}`,
    memberId: null,
  }));
}

export { SKIP_VALUE };

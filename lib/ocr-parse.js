/**
 * Google Vision OCR → [순위 / 닉네임 / 소속길드 / 점수] 행 파서.
 *
 * ──────────────────────────────────────────────────────────────────────
 *  대형 편집 이미지(2단 멀티컬럼) 대응 알고리즘 — 공성전 콘텐츠 기준
 * ──────────────────────────────────────────────────────────────────────
 *
 *  ① X축 컬럼 분할 (최우선) ─ `detectColumnSplit()`
 *     · 단어 박스 cx 분포에서 가장 큰 갭이 이미지 가운데(20–80%) 영역에
 *       있고 + 충분히 크면 2단(Multi-Column) 으로 판단해서 좌/우로 쪼갠다.
 *     · 1단(Single-Column) 이미지면 분할 없이 그대로 진행.
 *
 *  ② 컬럼 단위 Y축 라인 그룹핑 ─ `groupWordsIntoLines()`
 *     · 단어 박스 높이의 중앙값 × 0.55 를 임계값으로 같은 행으로 묶는다.
 *     · 행은 위→아래, 행 안의 단어는 좌→우 로 정렬.
 *
 *  ③ 행 단위 정규식 파서 ─ `parseScoreLine()`
 *     · `순위`  : 줄 앞쪽 1~2자리 정수 (1~99). 콤마 없는 작은 수.
 *     · `점수`  : 콤마 포함 또는 6자리 이상 정수.
 *                "10,300,222 Q", "3815347Q", "7,600,384" 등 알파벳
 *                접미사(Q/X/A 등)는 모두 제거하고 순수 숫자만 보존.
 *     · `닉네임`: 텍스트 토큰을 X 순으로 모으되, 공백을 제거해 한 단어로
 *                결합한다. ("피치래 빗" → "피치래빗")
 *     · `소속길드`: known-guild 키워드(황원/황월/백영 ...) 또는 마지막
 *                  토큰이 2~4자 한글이면 분리한다.
 *
 *  ④ 노이즈 필터 ─ "직전 길드원 랭킹", "토완", "확인필요" 등 시스템 UI
 *     단어들은 토큰 단위에서 제거하고, 공성전 모드에선 [순위] + [점수]
 *     가 모두 있어야 데이터 행으로 인정한다.
 *
 *  ⑤ 결과 결합: 좌측 컬럼(1~15위) 결과 → 우측 컬럼(16~30위) 결과 순서로
 *     단일 배열로 합친 뒤, 순위 정보가 충분하면 rank 오름차순으로 정렬.
 */

/* ============================================================
 * 상수 — 노이즈 / 길드 키워드
 * ============================================================ */

/**
 * 데이터 행이 아닌 시스템 UI 라벨 토큰 (정확 일치 시 무시).
 *
 * 공성전 화면 OCR에서 자주 섞이는 노이즈:
 *  - "확인필요" / "확인" / "필요" — 점수 옆에 붙는 시스템 알림
 *  - "탈퇴" / "탈퇴함" — 길드원 상태 라벨
 *  - "직전 길드원 랭킹" / "토완" — 섹션 헤더
 *  - 단독 단일 알파벳 (Q, X 등) 은 별도 함수에서 추가 처리
 */
const NOISE_WORDS = new Set([
  "직전", "길드원", "랭킹", "랭크", "직전길드원랭킹", "직전개인랭킹", "직전길드랭킹",
  "개인", "토완",
  "확인", "확인필요", "확인 필요", "필요",
  "탈퇴", "탈퇴함",
  "현재", "전체", "주간", "현재주간", "이번주",
  "이름", "닉네임", "닉네", "순위",
  "점수", "스코어", "총점", "합계",
  "길드", "guild", "서버", "server",
  "score", "scores", "rank", "ranking",
  "weekly", "accum", "accumulated", "cumulative",
  "total", "name", "level", "lv", "lv.",
  "직업", "class", "job", "등급", "grade",
]);

/**
 * 공성전 화면에서 자주 등장하는 길드·헤더 노이즈 (닉네임/점수에 섞이지 않도록 제거).
 * "백영대" 등 헤더성 텍스트도 포함.
 */
const DEFAULT_KNOWN_GUILDS = new Set([
  "황원",
  "황월",
  "백영",
  "백영대",
  "토관",
  "옥박",
  "SeeWay",
  "seeway",
]);

/** 닉네임/소속길드 분리용 폴백 패턴 — 마지막 토큰이 2~4자 한글이면 길드 후보 */
const HANGUL_GUILD_FALLBACK = /^[가-힣]{2,4}$/;

/* ============================================================
 * 토큰 메타 분석
 * ============================================================ */

const stripPunct = (s) =>
  String(s || "")
    .replace(/^[\[\(\<\{「『]+/, "")
    .replace(/[\]\)\>\}」』.,;:!?]+$/, "")
    .trim();

function isNoiseToken(raw) {
  const t = String(raw || "").trim();
  if (!t) return true;
  if (/^[a-zA-Z]$/.test(t)) return true; // 단독 단일 알파벳 (Q, X, A 등)
  const norm = stripPunct(t).toLowerCase();
  if (!norm) return true;
  return NOISE_WORDS.has(norm) || NOISE_WORDS.has(stripPunct(t));
}

function markToken(rawToken) {
  let cleaned = stripPunct(rawToken);

  // $00006638921 같은 닉네임 — 숫자 점수로 오인하지 않음
  if (/^[$#@]/.test(cleaned)) {
    return {
      raw: rawToken,
      cleaned,
      noCommas: cleaned.replace(/,/g, ""),
      isNumber: false,
      hasComma: false,
      numValue: 0,
      isNoise: isNoiseToken(cleaned),
    };
  }

  // "1234567Q", "10,300,222Q" → 알파벳 접미사 제거 후 숫자만
  const numAlphaSuffix = /^([\d,]+)[A-Za-z]+$/.exec(cleaned);
  if (numAlphaSuffix) cleaned = numAlphaSuffix[1];

  const noCommas = cleaned.replace(/,/g, "");
  const isNum = /^\d+$/.test(noCommas) && noCommas.length > 0;

  return {
    raw: rawToken,
    cleaned,
    noCommas,
    isNumber: isNum,
    hasComma: cleaned.includes(","),
    numValue: isNum ? parseInt(noCommas, 10) : 0,
    isNoise: isNoiseToken(cleaned),
  };
}

/* ============================================================
 * 행 단위 파서
 * ============================================================ */

/** 공성전 닉네임 유효성 — 1글자(무), $숫자 혼합 닉네임 허용 */
function isValidSiegeNick(nick) {
  if (!nick || !String(nick).trim()) return false;
  const n = String(nick).trim();
  if (n.startsWith("$")) return n.length >= 2;
  if (/^[가-힣a-zA-Z0-9_.·\-]+$/.test(n) && n.length >= 1) {
    if (/^\d+$/.test(n)) return false;
    return true;
  }
  return n.length >= 1 && !/^\d+$/.test(n);
}

function getKnownGuilds(options) {
  if (options.knownGuilds instanceof Set) return options.knownGuilds;
  if (Array.isArray(options.knownGuilds)) {
    return new Set([...DEFAULT_KNOWN_GUILDS, ...options.knownGuilds]);
  }
  return DEFAULT_KNOWN_GUILDS;
}

/**
 * 한 줄에서 순위·점수·텍스트 토큰만 추출 (완전한 행이 아니어도 됨).
 */
function extractLineParts(rawLine, options = {}) {
  const text = String(rawLine || "").trim();
  if (!text) return { rank: null, score: 0, textTokens: [] };

  const isSiege = options.contentName === "공성전";
  const knownGuilds = getKnownGuilds(options);
  const normalized = text.replace(/(\d)\s*,\s*(?=\d)/g, "$1,");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { rank: null, score: 0, textTokens: [] };

  const marked = tokens.map(markToken);

  let rank = null;
  let rankIdx = -1;
  for (let i = 0; i < marked.length; i++) {
    const m = marked[i];
    if (m.isNoise) continue;
    if (
      m.isNumber &&
      !m.hasComma &&
      m.noCommas.length <= 2 &&
      m.numValue >= 1 &&
      m.numValue <= 99
    ) {
      rank = m.numValue;
      rankIdx = i;
      break;
    }
  }

  let score = 0;
  let scoreIdx = -1;
  for (let i = marked.length - 1; i >= 0; i--) {
    if (i === rankIdx) continue;
    const m = marked[i];
    if (m.isNoise) continue;
    if (m.isNumber && (m.hasComma || m.noCommas.length >= 6)) {
      score = m.numValue;
      scoreIdx = i;
      break;
    }
  }
  if (score === 0) {
    for (let i = marked.length - 1; i >= 0; i--) {
      if (i === rankIdx) continue;
      const m = marked[i];
      if (m.isNoise) continue;
      if (m.isNumber && m.noCommas.length >= 4) {
        score = m.numValue;
        scoreIdx = i;
        break;
      }
    }
  }
  if (score === 0) {
    for (let i = 0; i < marked.length; i++) {
      if (i === rankIdx) continue;
      const m = marked[i];
      if (m.isNoise) continue;
      if (m.isNumber && m.numValue >= 10 && m.numValue > score) {
        score = m.numValue;
        scoreIdx = i;
      }
    }
  }

  const textTokens = [];
  for (let i = 0; i < marked.length; i++) {
    if (i === rankIdx || i === scoreIdx) continue;
    const m = marked[i];
    if (m.isNoise || m.isNumber) continue;
    if (!m.cleaned) continue;
    if (isSiege && knownGuilds.has(m.cleaned)) continue;
    textTokens.push(m.cleaned);
  }

  return { rank, score, textTokens };
}

function buildRowFromParts({ rank, score, textTokens }, options = {}) {
  const isSiege = options.contentName === "공성전";
  const knownGuilds = getKnownGuilds(options);

  let nick = "";
  let serverGuild = "";

  if (isSiege) {
    const filtered = textTokens.filter((t) => !knownGuilds.has(t));
    nick = filtered.join("").replace(/^[\[\(]+/, "").trim();
    serverGuild = "";
    if (!isValidSiegeNick(nick)) return null;
    if (rank == null || score === 0) return null;
  } else {
    let guildIdx = -1;
    for (let i = 0; i < textTokens.length; i++) {
      if (knownGuilds.has(textTokens[i])) {
        guildIdx = i;
        break;
      }
    }
    if (guildIdx >= 0) {
      nick = textTokens.slice(0, guildIdx).join("");
      serverGuild = textTokens.slice(guildIdx).join(" ");
    } else if (
      textTokens.length >= 2 &&
      HANGUL_GUILD_FALLBACK.test(textTokens[textTokens.length - 1])
    ) {
      nick = textTokens.slice(0, -1).join("");
      serverGuild = textTokens[textTokens.length - 1];
    } else {
      nick = textTokens.join("");
      serverGuild = "";
    }
    if (nick.length < 2 || /^\d+$/.test(nick)) return null;
    if (rank == null && score === 0) return null;
  }

  let nickWasTruncated = false;
  if (isSiege && nick.length > 12) {
    nick = nick.slice(0, 12);
    nickWasTruncated = true;
  }

  let conf = 80;
  if (score > 0) conf += 10;
  if (rank != null) conf += 5;
  if (score >= 1_000_000) conf += 3;
  if (nickWasTruncated) conf -= 8;
  conf = Math.max(50, Math.min(98, conf));

  const warn = conf < 78 || score === 0 || nickWasTruncated;

  return {
    rank,
    nick,
    serverGuild: "",
    weekly: score,
    accum: 0,
    job: "—",
    grade: "—",
    conf,
    warn,
    _raw: textTokens.join(" "),
  };
}

/** 단어 목록에서 순위 후보(1~99) 추출 */
function collectRanksFromWords(words) {
  const ranks = [];
  for (const w of words) {
    const m = markToken(w.text);
    if (
      m.isNumber &&
      !m.hasComma &&
      m.noCommas.length <= 2 &&
      m.numValue >= 1 &&
      m.numValue <= 99
    ) {
      ranks.push(m.numValue);
    }
  }
  return ranks;
}

/**
 * 진짜 2단 편집 이미지인지 검증.
 * 단일 컬럼 UI(순위 왼쪽 / 점수 오른쪽)는 가운데 갭이 커도 2단이 아님.
 * → 오른쪽에도 순위 숫자(대개 8 이상)가 있어야 2단으로 인정.
 */
function isTrueTwoColumnLayout(leftWords, rightWords) {
  if (!leftWords.length || !rightWords.length) return false;

  const leftRanks = collectRanksFromWords(leftWords);
  const rightRanks = collectRanksFromWords(rightWords);

  if (rightRanks.length < 2) return false;
  if (leftRanks.length < 2) return false;

  const rightMin = Math.min(...rightRanks);
  const leftMax = Math.max(...leftRanks);

  // 좌: 1~18위 / 우: 9~30위 형태 (경계 15·16 근처 겹침 허용)
  if (rightMin >= 8 && leftMax <= 20) return true;

  const rightMax = Math.max(...rightRanks);
  const leftMin = Math.min(...leftRanks);
  if (rightMin > leftMax && rightMin >= 10) return true;
  if (leftMin < rightMin && rightMax > leftMax && rightRanks.length >= 5) {
    return true;
  }

  return false;
}

/**
 * 공성전 UI: 순위 / 닉네임 / 점수가 여러 Y줄에 걸쳐 있음.
 * 모바일은 흔히 [순위] → [점수] → [닉네임(아래 길드명)] 순서.
 */
function parseSiegeColumnLines(lines, options = {}) {
  const rows = [];
  const seenKeys = new Set();
  const sorted = lines.slice().sort((a, b) => a.cy - b.cy);

  let pendingRank = null;
  let pendingTexts = [];
  let pendingScore = null;

  const resetPending = () => {
    pendingRank = null;
    pendingTexts = [];
    pendingScore = null;
  };

  const pushRow = (rank, score, textTokens) => {
    const row = buildRowFromParts({ rank, score, textTokens }, options);
    if (!row) return false;
    const key =
      row.rank != null ? `r${row.rank}` : `${row.nick.toLowerCase()}-${score}`;
    if (seenKeys.has(key)) return true;
    seenKeys.add(key);
    rows.push(row);
    return true;
  };

  const tryFlush = () => {
    if (pendingRank == null || pendingScore === 0 || pendingTexts.length === 0) {
      return false;
    }
    const ok = pushRow(pendingRank, pendingScore, pendingTexts);
    if (ok) resetPending();
    return ok;
  };

  for (const line of sorted) {
    const lineText = line.words.map((w) => w.text).join(" ").trim();
    if (!lineText) continue;

    const parts = extractLineParts(lineText, options);

    if (
      parts.rank != null &&
      parts.score > 0 &&
      parts.textTokens.length > 0
    ) {
      pushRow(parts.rank, parts.score, parts.textTokens);
      resetPending();
      continue;
    }

    if (parts.rank != null) {
      resetPending();
      pendingRank = parts.rank;
      if (parts.textTokens.length) {
        pendingTexts.push(...parts.textTokens);
      }
      if (parts.score > 0) {
        pendingScore = parts.score;
        tryFlush();
      }
      continue;
    }

    if (parts.score > 0) {
      if (pendingRank != null) {
        pendingScore = parts.score;
        if (pendingTexts.length > 0) {
          tryFlush();
        }
      }
      continue;
    }

    if (parts.textTokens.length > 0) {
      if (pendingRank != null) {
        pendingTexts.push(...parts.textTokens);
      }
      if (pendingRank != null && pendingScore != null && pendingTexts.length > 0) {
        tryFlush();
      }
    }
  }

  tryFlush();
  return rows;
}

function parseSiegeFromWords(allWords, options = {}) {
  const lines = groupWordsIntoLines(allWords);
  return parseSiegeColumnLines(lines, options);
}

export function parseScoreLine(rawLine, options = {}) {
  const parts = extractLineParts(rawLine, options);
  if (parts.rank == null && parts.score === 0 && parts.textTokens.length === 0) {
    return null;
  }
  const row = buildRowFromParts(parts, options);
  if (row) row._raw = String(rawLine || "").trim();
  return row;
}

/* ============================================================
 * 단어 박스 추출 / 컬럼 분할 / Y축 그룹핑
 * ============================================================ */

function extractWordBoxes(annotations) {
  return annotations
    .map((ann) => {
      const v = ann.boundingPoly?.vertices || [];
      if (!v.length) return null;
      const ys = v.map((p) => p.y || 0);
      const xs = v.map((p) => p.x || 0);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      return {
        text: ann.description,
        cy: (minY + maxY) / 2,
        cx: (minX + maxX) / 2,
        minX,
        maxX,
        minY,
        maxY,
        h: Math.max(1, maxY - minY),
        w: Math.max(1, maxX - minX),
      };
    })
    .filter(Boolean);
}

/**
 * X 축 분포에서 가장 큰 갭이 중앙(20~80%)에 있고, 충분히 크면(span 의 12% +
 * 단어간 평균 갭의 4배 이상) 2단 레이아웃으로 판단해서 분할 X 좌표를 반환.
 * 단일 컬럼이면 null.
 */
function detectColumnSplit(words) {
  if (words.length < 8) return null;

  const cxs = words.map((w) => w.cx).slice().sort((a, b) => a - b);
  const minCx = cxs[0];
  const maxCx = cxs[cxs.length - 1];
  const span = maxCx - minCx;
  if (span < 300) return null;

  const gaps = [];
  for (let i = 1; i < cxs.length; i++) {
    gaps.push({
      gap: cxs[i] - cxs[i - 1],
      mid: (cxs[i] + cxs[i - 1]) / 2,
    });
  }
  if (gaps.length < 4) return null;

  const sortedGaps = gaps.map((g) => g.gap).slice().sort((a, b) => a - b);
  const medianGap =
    sortedGaps[Math.floor(sortedGaps.length / 2)] || 1;

  const largest = gaps.reduce((best, g) => (g.gap > best.gap ? g : best));

  const minGapForSplit = Math.max(span * 0.12, medianGap * 4, 60);
  const centralMin = minCx + span * 0.2;
  const centralMax = minCx + span * 0.8;

  if (
    largest.gap < minGapForSplit ||
    largest.mid < centralMin ||
    largest.mid > centralMax
  ) {
    return null;
  }

  const splitX = largest.mid;
  const left = words.filter((w) => w.cx < splitX);
  const right = words.filter((w) => w.cx >= splitX);

  if (!isTrueTwoColumnLayout(left, right)) {
    return null;
  }

  return splitX;
}

function groupWordsIntoLines(words) {
  if (!words.length) return [];

  const heights = words.map((w) => w.h).slice().sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 14;
  const yThresh = Math.max(6, medianH * 0.55);

  const sorted = words.slice().sort((a, b) => a.cy - b.cy || a.minX - b.minX);

  const lines = [];
  for (const w of sorted) {
    const last = lines[lines.length - 1];
    if (!last || Math.abs(w.cy - last.cy) > yThresh) {
      lines.push({ cy: w.cy, words: [w] });
    } else {
      last.words.push(w);
      last.cy =
        (last.cy * (last.words.length - 1) + w.cy) / last.words.length;
    }
  }

  lines.forEach((line) => {
    line.words.sort((a, b) => a.minX - b.minX);
  });

  return lines;
}

/* ============================================================
 * 메인 엔트리
 * ============================================================ */

export function parseVisionAnnotations(textAnnotations, options = {}) {
  if (!textAnnotations?.length) return [];

  if (textAnnotations.length < 2) {
    return parseOcrPlainText(textAnnotations[0]?.description || "", options);
  }

  const allWords = extractWordBoxes(textAnnotations.slice(1));
  if (!allWords.length) {
    return parseOcrPlainText(textAnnotations[0]?.description || "", options);
  }

  const isSiege = options.contentName === "공성전";

  // ── 공성전: 단일 vs 진짜 2단 편집 이미지 분기 ─────────────
  const splitX = isSiege ? detectColumnSplit(allWords) : null;

  let allRows = [];
  const seenKeys = new Set();

  const mergeRows = (colRows, columnIdx) => {
    let n = 0;
    for (const parsed of colRows) {
      const key =
        parsed.rank != null ? `r${parsed.rank}` : parsed.nick.toLowerCase();
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      parsed._column = columnIdx;
      allRows.push(parsed);
      n++;
    }
    return n;
  };

  if (isSiege && splitX !== null) {
    const left = allWords.filter((w) => w.cx < splitX);
    const right = allWords.filter((w) => w.cx >= splitX);
    if (options.debug !== false) {
      console.log(
        `[OCR] 2-column siege layout. splitX=${Math.round(splitX)}, left=${left.length}w, right=${right.length}w`
      );
    }
    const leftLines = groupWordsIntoLines(left);
    const rightLines = groupWordsIntoLines(right);
    const n0 = mergeRows(parseSiegeColumnLines(leftLines, options), 0);
    const n1 = mergeRows(parseSiegeColumnLines(rightLines, options), 1);
    if (options.debug !== false) {
      console.log(
        `[OCR] column 0 → ${leftLines.length} Y-lines, ${n0} rows | column 1 → ${rightLines.length} Y-lines, ${n1} rows`
      );
    }
  } else {
    if (options.debug !== false) {
      console.log(
        `[OCR] Single-column layout (words=${allWords.length}, siege=${isSiege})`
      );
    }
    const lines = groupWordsIntoLines(allWords);
    const colRows = isSiege
      ? parseSiegeColumnLines(lines, options)
      : lines
          .map((line) => {
            const lineText = line.words.map((w) => w.text).join(" ").trim();
            return parseScoreLine(lineText, options);
          })
          .filter(Boolean);
    const n = mergeRows(colRows, 0);
    if (options.debug !== false) {
      console.log(`[OCR] full width → ${lines.length} Y-lines, ${n} valid rows`);
    }
  }

  // 2단 오판으로 0건이면 단일 컬럼으로 재시도
  if (isSiege && allRows.length === 0 && splitX !== null) {
    if (options.debug !== false) {
      console.log("[OCR] 0 rows after 2-column split — retrying as single column");
    }
    seenKeys.clear();
    allRows = [];
    const n = mergeRows(parseSiegeFromWords(allWords, options), 0);
    if (options.debug !== false) {
      console.log(`[OCR] single-column retry → ${n} rows`);
    }
  }

  // ── 결과 정렬: 모든 행에 rank 가 있으면 rank 오름차순 ────
  const haveRanks = allRows.length > 1 && allRows.every((r) => r.rank != null);
  if (haveRanks) {
    allRows.sort((a, b) => a.rank - b.rank);
  }

  if (allRows.length === 0) {
    return parseOcrPlainText(textAnnotations[0]?.description || "", options);
  }

  return allRows;
}

export function parseOcrPlainText(fullText, options = {}) {
  const lines = String(fullText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  const seen = new Set();
  for (const line of lines) {
    const parsed = parseScoreLine(line, options);
    if (!parsed) continue;
    const key = parsed.nick.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(parsed);
  }
  return rows;
}

/* ============================================================
 * 길드원 매칭 (사전 선택된 길드원 명단과 OCR 닉네임 정합)
 * ============================================================ */

function basicNorm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s\-_·.]/g, "");
}

function deepNorm(s) {
  return basicNorm(s)
    .replace(/0/g, "o")
    .replace(/[1i]/g, "l")
    .replace(/5/g, "s")
    .replace(/2/g, "z")
    .replace(/8/g, "b")
    .replace(/6/g, "g");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function findBestMember(nick, members) {
  if (!nick || !members?.length) return { member: null, score: 0, kind: "none" };
  const target = basicNorm(nick);
  if (!target) return { member: null, score: 0, kind: "none" };

  for (const m of members) {
    if (basicNorm(m.nick) === target) {
      return { member: m, score: 100, kind: "exact" };
    }
  }

  const targetDeep = deepNorm(nick);
  for (const m of members) {
    if (deepNorm(m.nick) === targetDeep) {
      return { member: m, score: 95, kind: "fuzzy" };
    }
  }

  let best = null;
  for (const m of members) {
    const cand = deepNorm(m.nick);
    if (!cand) continue;
    const dist = levenshtein(targetDeep, cand);
    const maxLen = Math.max(targetDeep.length, cand.length, 1);
    const sim = 1 - dist / maxLen;
    if (!best || sim > best.sim) best = { member: m, sim };
  }

  if (!best || best.sim < 0.65) return { member: null, score: 0, kind: "none" };
  return { member: best.member, score: Math.round(best.sim * 100), kind: "fuzzy" };
}

export function attachMemberIds(parsedRows, members = []) {
  return (parsedRows || []).map((row, i) => {
    const { member, score, kind } = findBestMember(row.nick, members);
    const memberId = member?.id != null ? Number(member.id) : null;

    let conf = row.conf || 80;
    if (memberId != null && kind === "fuzzy") {
      conf = Math.min(conf, score);
    }

    const warn =
      row.warn ||
      memberId == null ||
      (kind === "fuzzy" && score < 85);

    return {
      ...row,
      id: `ocr-${i}`,
      memberId,
      matchedNick: member?.nick || null,
      matchKind: kind,
      matchScore: score,
      job: member?.job || row.job || "—",
      conf,
      warn,
    };
  });
}

export function summarizeOcrRows(rows) {
  const list = rows || [];
  const avgConf = list.length
    ? Math.round(list.reduce((s, r) => s + (r.conf || 0), 0) / list.length)
    : 0;
  const warnCount = list.filter((r) => r.warn).length;
  return { count: list.length, avgConf, warnCount };
}

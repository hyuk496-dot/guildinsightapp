const SKIP_LINE =
  /^(닉네임|닉네|이름|순위|rank|#|no\.?|길드|합계|total|주간|누적|점수|직업|등급|서버|member|weekly|accum)/i;

/** Vision OCR 한 줄에서 닉네임·점수·등급 추출 */
export function parseScoreLine(line) {
  const raw = String(line || "").trim();
  if (!raw || raw.length < 3 || SKIP_LINE.test(raw)) return null;

  const cleaned = raw.replace(/,/g, " ").replace(/\s+/g, " ");
  const gradeMatch = cleaned.match(/\b([SABC])\b/i);
  const grade = gradeMatch ? gradeMatch[1].toUpperCase() : "—";

  const numbers = [...cleaned.matchAll(/\b(\d{2,6})\b/g)].map((m) => parseInt(m[1], 10));
  if (numbers.length === 0) return null;

  let weekly;
  let accum;
  if (numbers.length >= 2) {
    const asc = [...numbers].sort((a, b) => a - b);
    weekly = asc[asc.length - 2];
    accum = asc[asc.length - 1];
    if (weekly > accum) [weekly, accum] = [accum, weekly];
  } else {
    weekly = numbers[0];
    accum = numbers[0];
  }

  let textPart = cleaned
    .replace(/\b\d{2,6}\b/g, " ")
    .replace(/\b[SABC]\b/gi, " ")
    .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ·.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = textPart.split(" ").filter(Boolean);
  const nick = tokens[0] || "Unknown";
  const job = tokens[1] || "—";

  if (nick.length < 2 || /^\d+$/.test(nick)) return null;

  const conf =
    numbers.length >= 2 && nick.length >= 2
      ? gradeMatch
        ? 93
        : 86
      : 72;
  const warn = conf < 80;

  return { nick, job, weekly, accum, grade, conf, warn };
}

export function parseOcrPlainText(fullText) {
  const lines = String(fullText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  const seen = new Set();

  for (const line of lines) {
    const parsed = parseScoreLine(line);
    if (!parsed) continue;
    const key = parsed.nick.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(parsed);
  }

  return rows;
}

/** textAnnotations 단어 블록을 Y좌표로 행 묶기 */
export function parseVisionAnnotations(textAnnotations) {
  if (!textAnnotations?.length) return [];

  if (textAnnotations.length < 2) {
    return parseOcrPlainText(textAnnotations[0]?.description || "");
  }

  const words = textAnnotations.slice(1).map((ann) => {
    const v = ann.boundingPoly?.vertices || [];
    const y = v.reduce((s, p) => s + (p.y || 0), 0) / (v.length || 1);
    const x = v.reduce((s, p) => s + (p.x || 0), 0) / (v.length || 1);
    return { text: ann.description, y, x };
  });

  words.sort((a, b) => a.y - b.y || a.x - b.x);

  const lineGroups = [];
  const Y_THRESH = 14;
  let bucket = [];
  let lastY = -9999;

  for (const w of words) {
    if (bucket.length && Math.abs(w.y - lastY) > Y_THRESH) {
      lineGroups.push(bucket);
      bucket = [];
    }
    bucket.push(w);
    lastY = w.y;
  }
  if (bucket.length) lineGroups.push(bucket);

  const rows = [];
  const seen = new Set();

  for (const group of lineGroups) {
    const line = group
      .map((w) => w.text)
      .join(" ")
      .trim();
    const parsed = parseScoreLine(line);
    if (!parsed) continue;
    const key = parsed.nick.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(parsed);
  }

  if (rows.length === 0) {
    return parseOcrPlainText(textAnnotations[0]?.description || "");
  }

  return rows;
}

/** 공백·구두점 제거, 소문자화 */
function basicNorm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s\-_·.]/g, "");
}

/** OCR 혼동 문자(0↔O, 1↔l↔I, 5↔S, 2↔Z 등) 정규화 */
function deepNorm(s) {
  return basicNorm(s)
    .replace(/0/g, "o")
    .replace(/[1i]/g, "l")
    .replace(/5/g, "s")
    .replace(/2/g, "z")
    .replace(/8/g, "b")
    .replace(/6/g, "g");
}

/** Levenshtein 편집 거리 */
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

/**
 * @returns {{ member: object|null, score: number, kind: 'exact'|'fuzzy'|'none' }}
 */
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

/** 길드원 정보 적용 (정규화 + 퍼지 매칭) */
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

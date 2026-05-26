'use client';
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const C = "#00c8ff";

const TICKER_DATA = [
  ["ShadowFang", "#7", "2,841", true],
  ["DragonBlood", "#1", "4,210", true],
  ["IronValor", "#2", "3,988", false],
  ["StarFall", "#3", "3,720", false],
  ["PhoenixRise", "#4", "3,540", true],
  ["CrystalEdge", "#5", "3,181", true],
  ["ShadowFang", "#7", "2,841", true],
  ["DragonBlood", "#1", "4,210", true],
  ["IronValor", "#2", "3,988", false],
  ["StarFall", "#3", "3,720", false],
];

const RADAR_AXES = ["점수관리", "기여도", "OCR", "GPT", "시뮬", "대시보드"];
const RADAR_VALS = [0.92, 0.85, 0.88, 0.78, 0.82, 0.95];

export function LandingPage() {
  const router = useRouter();

  const gridCanvasRef = useRef(null);
  const radarCanvasRef = useRef(null);
  const modalRef = useRef(null);
  const archRef = useRef(null);
  const ringRef = useRef(null);
  const unlockTxtRef = useRef(null);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [tab, setTab] = useState("login");
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [oauthError, setOauthError] = useState(null);

  // Grid background
  useEffect(() => {
    const cv = gridCanvasRef.current;
    if (!cv) return;
    const draw = () => {
      cv.width = cv.offsetWidth;
      cv.height = cv.offsetHeight;
      const ctx = cv.getContext("2d");
      const w = cv.width;
      const h = cv.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(0,200,255,0.06)";
      ctx.lineWidth = 0.5;
      const sz = 36;
      for (let x = 0; x < w; x += sz) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += sz) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let i = 0; i < 22; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,200,255,0.25)";
        ctx.fill();
      }
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  // Radar chart
  useEffect(() => {
    const cv = radarCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const cx = 110;
    const cy = 110;
    const R = 80;
    const n = RADAR_AXES.length;
    const step = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, 220, 220);
    for (let ring = 1; ring <= 4; ring++) {
      const r = (R * ring) / 4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = step * i - Math.PI / 2;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0,200,255,${0.06 + ring * 0.04})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      const a = step * i - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      ctx.strokeStyle = "rgba(0,200,255,0.12)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.beginPath();
    RADAR_VALS.forEach((v, i) => {
      const a = step * i - Math.PI / 2;
      const x = cx + R * v * Math.cos(a);
      const y = cy + R * v * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(0,200,255,0.12)";
    ctx.fill();
    ctx.strokeStyle = C;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    RADAR_VALS.forEach((v, i) => {
      const a = step * i - Math.PI / 2;
      const x = cx + R * v * Math.cos(a);
      const y = cy + R * v * Math.sin(a);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = C;
      ctx.fill();
    });

    RADAR_AXES.forEach((lbl, i) => {
      const a = step * i - Math.PI / 2;
      const x = cx + (R + 18) * Math.cos(a);
      const y = cy + (R + 18) * Math.sin(a);
      ctx.fillStyle = "rgba(0,200,255,0.55)";
      ctx.font = "9px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(lbl, x, y);
    });
  }, []);

  const closeOverlay = () => setOverlayOpen(false);

  const playUnlockAndEnter = () => {
    setUnlocking(true);
    let t = 0;
    const arch = archRef.current;
    const ring = ringRef.current;
    const txt = unlockTxtRef.current;
    const anim = setInterval(() => {
      t += 16;
      if (t < 280 && arch) {
        const prog = t / 280;
        arch.setAttribute("d", `M32 ${36 - prog * 10}V${28 - prog * 6}a8 8 0 0 1 16 0`);
      }
      if (t === 288 || (t > 280 && t <= 304)) {
        if (arch) arch.setAttribute("d", "M32 26V22a8 8 0 0 1 16 0");
        if (ring) {
          ring.style.opacity = "0.6";
          ring.setAttribute("r", "38");
        }
        if (txt) txt.style.opacity = "1";
      }
      if (t > 304 && ring) {
        const rr = Math.min(54, 38 + (t - 304) / 10);
        ring.setAttribute("r", String(Math.round(rr)));
        ring.style.opacity = String(Math.max(0, 0.6 - (t - 304) / 600));
      }
      if (t > 600) {
        clearInterval(anim);
        try {
          sessionStorage.setItem("gi.preferredGuildName", "비회원 샘플 길드");
        } catch {}
        router.push("/dashboard");
      }
    }, 16);
  };

  const doLogin = async () => {
    if (!loginId.trim() || !loginPw) {
      setErrMsg("ID와 비밀번호를 입력하세요.");
      return;
    }

    // ID 가 "admin" 이면 Supabase 이메일 계정 admin@guildinsight.local 로 매핑한다.
    // 그 외 입력은 email 형식이면 그대로, 아니면 @guildinsight.local 도메인을 붙여 인증 시도.
    const rawId = loginId.trim();
    const email = rawId === "admin"
      ? "admin@guildinsight.local"
      : rawId.includes("@")
        ? rawId
        : `${rawId}@guildinsight.local`;

    setErrMsg("");
    try {
      const { getBrowserSupabase } = await import("@/lib/supabase-browser");
      const supa = getBrowserSupabase();
      const { error } = await supa.auth.signInWithPassword({
        email,
        password: loginPw,
      });
      if (error) throw error;
      try {
        if (rawId === "admin") {
          sessionStorage.setItem("gi.preferredGuildName", "비회원 샘플 길드");
        }
      } catch {}
      closeOverlay();
      playUnlockAndEnter();
    } catch (err) {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("invalid login credentials")) {
        setErrMsg("ID 또는 비밀번호가 올바르지 않습니다.");
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        setErrMsg("이메일 인증이 필요한 계정입니다. Supabase Dashboard 에서 'Auto Confirm User' 옵션을 켠 뒤 다시 만들거나 Confirm 처리하세요.");
      } else {
        setErrMsg(`로그인 실패: ${msg || "알 수 없는 오류"}`);
      }
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }
  };

  const doOAuth = async (provider) => {
    setOauthError(null);
    setOauthLoading(provider);
    try {
      try {
        sessionStorage.setItem("gi.preferredGuildName", "비회원 샘플 길드");
      } catch {}
      const { getBrowserSupabase } = await import("@/lib/supabase-browser");
      const supa = getBrowserSupabase();
      const { error } = await supa.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // 정상 흐름이면 브라우저가 OAuth 제공자 페이지로 리다이렉트되므로 여기 이후 코드는 실행되지 않음
    } catch (err) {
      console.error(`${provider} OAuth 에러:`, err);
      setOauthError(
        err?.message?.includes("provider is not enabled")
          ? `${provider} 로그인이 Supabase에 활성화되지 않았습니다. 대시보드에서 Provider를 활성화하세요.`
          : err?.message || "로그인 실패"
      );
      setOauthLoading(null);
    }
  };

  const doEmailSignup = () => {
    alert(
      "이메일 가입은 곧 활성화됩니다.\n현재는 Google 또는 Discord로 가입을 권장합니다."
    );
  };


  return (
    <div id="app">
      <canvas className="grid-bg" ref={gridCanvasRef} />

      {/* NAV */}
      <nav className="nav">
        <div className="logo-wrap">
          <svg className="logo-hex" viewBox="0 0 28 28" fill="none">
            <polygon points="14,2 24,8 24,20 14,26 4,20 4,8" stroke={C} strokeWidth="1" fill="rgba(0,200,255,0.06)" />
            <polygon points="14,7 20,10.5 20,17.5 14,21 8,17.5 8,10.5" stroke={C} strokeWidth="0.5" fill="rgba(0,200,255,0.08)" />
            <circle cx="14" cy="14" r="3" fill={C} opacity="0.9" />
          </svg>
          <div>
            <div className="logo-txt">GUILD INSIGHT</div>
            <div className="logo-sub">OPERATIONS SaaS</div>
          </div>
        </div>
        <div className="nav-links">
          <span className="nav-link">FEATURES</span>
          <span className="nav-link">DEMO</span>
          <span className="nav-link" onClick={() => router.push("/gptreport/compare")}>PRICING</span>
        </div>
        <div
          className="lock-btn"
          onClick={() => setOverlayOpen(true)}
          title="로그인"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="8" width="12" height="9" rx="2" stroke={C} strokeWidth="1.2" fill="rgba(0,200,255,0.08)" />
            <path d="M6 8V5.5a3 3 0 0 1 6 0V8" stroke={C} strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <circle cx="9" cy="12.5" r="1.5" fill={C} />
            <line x1="9" y1="14" x2="9" y2="15.5" stroke={C} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">// MMORPG GUILD OPERATIONS PLATFORM</div>
          <div className="hero-title">
            길드 운영,
            <br />
            <span>데이터로</span> 지배하라
          </div>
          <div className="hero-desc">
            OCR 자동 점수 추출 · GPT 전략 리포트 · 실시간 랭킹 시뮬레이션. 엑셀과 카카오톡을 버리고 하나의 플랫폼으로.
          </div>
          <div className="feature-pills">
            {["OCR 자동화", "GPT 리포트", "랭킹 시뮬", "기여도 분석", "대시보드"].map((p) => (
              <span className="pill" key={p}>
                {p}
              </span>
            ))}
          </div>
          <div className="stat-row">
            <div className="stat-item">
              <div className="stat-num">2,400+</div>
              <div className="stat-lbl">GUILD MASTERS</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">98.4%</div>
              <div className="stat-lbl">OCR ACCURACY</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">-70%</div>
              <div className="stat-lbl">ADMIN TIME</div>
            </div>
          </div>
        </div>
        <div className="hero-right">
          <canvas ref={radarCanvasRef} width="220" height="220" />
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker">
        <span className="ticker-label">LIVE</span>
        <div className="ticker-items">
          {TICKER_DATA.map(([g, r, s, up], i) => (
            <span className="tick-item" key={i}>
              <span style={{ color: "rgba(0,200,255,0.4)" }}>{g}</span>
              <span style={{ color: "rgba(0,200,255,0.25)" }}>{r}</span>
              <span className={up ? "tick-up" : "tick-dn"}>
                {up ? "▲" : "▼"} {s}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* FEATURE CARDS */}
      <div className="cards-row">
        <FeatCard name="OCR 점수 추출" desc="스크린샷 업로드만으로 점수 자동 인식 및 DB 저장" bar={92} icon={<OcrIcon />} />
        <FeatCard name="기여도 분석" desc="길드원별 점수 상승률·기여 비중을 시각화 차트로 제공" bar={78} icon={<TrendIcon />} />
        <FeatCard name="GPT 리포트" desc="매주 AI가 작성하는 운영 분석 리포트 & 전략 제안" bar={85} icon={<TriangleIcon />} />
      </div>

      {/* LOGIN MODAL */}
      <div
        className={`overlay ${overlayOpen ? "open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeOverlay();
        }}
      >
        <div className={`modal ${shaking ? "shake" : ""}`} ref={modalRef}>
          <div className="modal-logo">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <polygon
                points="14,2 24,8 24,20 14,26 4,20 4,8"
                stroke={C}
                strokeWidth="1"
                fill="rgba(0,200,255,0.06)"
              />
              <polygon
                points="14,7 20,10.5 20,17.5 14,21 8,17.5 8,10.5"
                stroke={C}
                strokeWidth="0.5"
                fill="rgba(0,200,255,0.08)"
              />
              <circle cx="14" cy="14" r="3" fill={C} opacity="0.9" />
            </svg>
            <span className="modal-title">GUILD INSIGHT</span>
          </div>
          <div className="modal-tab">
            <button
              className={`tab-btn ${tab === "login" ? "active" : ""}`}
              onClick={() => setTab("login")}
              type="button"
            >
              LOGIN
            </button>
            <button
              className={`tab-btn ${tab === "signup" ? "active" : ""}`}
              onClick={() => setTab("signup")}
              type="button"
            >
              SIGN UP
            </button>
          </div>
          {tab === "login" ? (
            <div>
              <div className="field-wrap">
                <div className="field-label">GUILD ID</div>
                <input
                  className="cyber-input"
                  type="text"
                  placeholder="guild_master_id"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                />
              </div>
              <div className="field-wrap">
                <div className="field-label">PASSWORD</div>
                <input
                  className="cyber-input"
                  type="password"
                  placeholder="••••••••"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                />
              </div>
              <div className="err-msg">{errMsg}</div>
              <button className="login-btn" onClick={doLogin} type="button">
                ACCESS SYSTEM
              </button>
            </div>
          ) : (
            <div className="oauth-stack">
              <div className="oauth-intro">
                <div className="oauth-intro-title">길드 운영자 등록</div>
                <div className="oauth-intro-sub">
                  소셜 계정으로 30초 만에 시작하세요.
                </div>
              </div>

              <button
                className="oauth-btn google"
                onClick={() => doOAuth("google")}
                disabled={oauthLoading !== null}
                type="button"
              >
                {oauthLoading === "google" ? <SpinnerIcon /> : <GoogleIcon />}
                <span>{oauthLoading === "google" ? "Google로 이동 중..." : "Google로 시작하기"}</span>
              </button>

              <button
                className="oauth-btn discord"
                onClick={() => doOAuth("discord")}
                disabled={oauthLoading !== null}
                type="button"
              >
                {oauthLoading === "discord" ? <SpinnerIcon /> : <DiscordIcon />}
                <span>{oauthLoading === "discord" ? "Discord로 이동 중..." : "Discord로 시작하기"}</span>
              </button>

              <div className="oauth-divider">
                <span>OR</span>
              </div>

              <button
                className="oauth-btn email"
                onClick={doEmailSignup}
                disabled={oauthLoading !== null}
                type="button"
              >
                <EmailIcon />
                <span>이메일로 가입 (준비 중)</span>
              </button>

              {oauthError && <div className="err-msg">{oauthError}</div>}

              <div className="oauth-foot">
                가입 시 <span className="oauth-link">이용약관</span> 및{" "}
                <span className="oauth-link">개인정보처리방침</span>에 동의하게 됩니다.
              </div>
            </div>
          )}
          <div style={{ textAlign: "right", marginTop: 12 }}>
            <span
              style={{ fontSize: 10, color: "rgba(0,200,255,0.3)", cursor: "pointer" }}
              onClick={closeOverlay}
            >
              CLOSE ✕
            </span>
          </div>
        </div>
      </div>

      {/* UNLOCK ANIMATION */}
      <div className={`unlock-screen ${unlocking ? "show" : ""}`}>
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke={C} strokeWidth="1" opacity="0.3" />
          <circle cx="40" cy="40" r="28" stroke={C} strokeWidth="0.5" opacity="0.2" />
          <rect x="24" y="36" width="32" height="24" rx="4" stroke={C} strokeWidth="1.5" fill="rgba(0,200,255,0.1)" />
          <path ref={archRef} d="M32 36V28a8 8 0 0 1 16 0" stroke={C} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="40" cy="46" r="4" fill={C} />
          <line x1="40" y1="50" x2="40" y2="55" stroke={C} strokeWidth="2" strokeLinecap="round" />
          <circle ref={ringRef} cx="40" cy="40" r="36" stroke={C} strokeWidth="2" fill="none" opacity="0" />
        </svg>
        <div
          ref={unlockTxtRef}
          style={{
            marginTop: 16,
            fontSize: 11,
            color: C,
            letterSpacing: "0.2em",
            opacity: 0,
            transition: "opacity 0.3s",
          }}
        >
          ACCESS GRANTED
        </div>
      </div>

      {/* SCOPED STYLES */}
      <style jsx>{`
        #app {
          font-family: "Courier New", monospace;
          background: #080c14;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          color: #e8f4ff;
        }
        .grid-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 28px;
          border-bottom: 1px solid rgba(0, 200, 255, 0.1);
        }
        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-hex {
          width: 28px;
          height: 28px;
        }
        .logo-txt {
          font-size: 15px;
          font-weight: 500;
          color: #00c8ff;
          letter-spacing: 0.08em;
        }
        .logo-sub {
          font-size: 10px;
          color: rgba(0, 200, 255, 0.5);
          letter-spacing: 0.15em;
          margin-top: 1px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .nav-link {
          font-size: 11px;
          color: rgba(0, 200, 255, 0.55);
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: #00c8ff;
        }
        .lock-btn {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(0, 200, 255, 0.35);
          border-radius: 8px;
          background: rgba(0, 200, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .lock-btn:hover {
          border-color: rgba(0, 200, 255, 0.8);
          background: rgba(0, 200, 255, 0.12);
        }

        .hero {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 40px 28px 0;
          gap: 24px;
        }
        .hero-left {
          flex: 1;
          padding-top: 10px;
        }
        .hero-eyebrow {
          font-size: 10px;
          color: rgba(0, 200, 255, 0.5);
          letter-spacing: 0.25em;
          margin-bottom: 16px;
        }
        .hero-title {
          font-family: "GmarketSans", "Pretendard", "Apple SD Gothic Neo",
            "Malgun Gothic", system-ui, sans-serif;
          font-size: clamp(36px, 4.4vw, 52px);
          font-weight: 700;
          color: #e8f4ff;
          line-height: 1.18;
          margin-bottom: 16px;
          letter-spacing: -0.01em;
          word-break: keep-all;
          text-shadow: 0 0 24px rgba(0, 200, 255, 0.18);
        }
        .hero-title :global(span) {
          color: #00c8ff;
          background: linear-gradient(135deg, #00c8ff 0%, #4cff91 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-desc {
          font-size: 12px;
          color: rgba(180, 210, 240, 0.6);
          line-height: 1.7;
          max-width: 360px;
          margin-bottom: 24px;
        }
        .feature-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 28px;
        }
        .pill {
          font-size: 10px;
          padding: 4px 12px;
          border: 1px solid rgba(0, 200, 255, 0.2);
          border-radius: 20px;
          color: rgba(0, 200, 255, 0.7);
          letter-spacing: 0.08em;
        }
        .stat-row {
          display: flex;
          gap: 28px;
        }
        .stat-num {
          font-size: 22px;
          font-weight: 500;
          color: #00c8ff;
        }
        .stat-lbl {
          font-size: 10px;
          color: rgba(0, 200, 255, 0.4);
          letter-spacing: 0.1em;
          margin-top: 2px;
        }
        .hero-right {
          width: 240px;
          flex-shrink: 0;
        }

        .ticker {
          position: relative;
          z-index: 5;
          margin: 28px 28px 0;
          border: 1px solid rgba(0, 200, 255, 0.1);
          border-radius: 8px;
          background: rgba(0, 200, 255, 0.03);
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 20px;
          overflow: hidden;
        }
        .ticker-label {
          font-size: 10px;
          color: rgba(0, 200, 255, 0.4);
          letter-spacing: 0.15em;
          flex-shrink: 0;
        }
        .ticker-items {
          display: flex;
          gap: 24px;
          animation: tick 16s linear infinite;
        }
        @keyframes tick {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .tick-item {
          font-size: 11px;
          color: rgba(0, 200, 255, 0.7);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tick-up { color: #4cff91; }
        .tick-dn { color: #ff5b5b; }

        .cards-row {
          position: relative;
          z-index: 5;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding: 16px 28px 36px;
        }

        .overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(4, 10, 20, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        .overlay.open {
          opacity: 1;
          pointer-events: all;
        }
        .modal {
          width: 320px;
          border: 1px solid rgba(0, 200, 255, 0.25);
          border-radius: 14px;
          background: #0d1a2a;
          padding: 28px 24px;
          box-shadow: 0 20px 60px rgba(0, 200, 255, 0.15);
        }
        .modal.shake {
          animation: shake 0.3s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
        }
        .modal-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .modal-title {
          font-size: 15px;
          font-weight: 500;
          color: #00c8ff;
          letter-spacing: 0.08em;
        }
        .modal-tab {
          display: flex;
          gap: 0;
          margin-bottom: 20px;
          border: 1px solid rgba(0, 200, 255, 0.2);
          border-radius: 8px;
          overflow: hidden;
        }
        .tab-btn {
          flex: 1;
          font-size: 11px;
          padding: 8px;
          border: none;
          background: transparent;
          color: rgba(0, 200, 255, 0.4);
          cursor: pointer;
          letter-spacing: 0.08em;
          transition: all 0.2s;
          font-family: "Courier New", monospace;
        }
        .tab-btn.active {
          background: rgba(0, 200, 255, 0.12);
          color: #00c8ff;
        }
        .field-wrap { margin-bottom: 12px; }
        .field-label {
          font-size: 10px;
          color: rgba(0, 200, 255, 0.45);
          letter-spacing: 0.12em;
          margin-bottom: 5px;
        }
        .cyber-input {
          width: 100%;
          background: rgba(0, 200, 255, 0.05);
          border: 1px solid rgba(0, 200, 255, 0.2);
          border-radius: 7px;
          color: #a8d4f0;
          font-size: 12px;
          padding: 8px 12px;
          outline: none;
          transition: border-color 0.2s;
          font-family: "Courier New", monospace;
        }
        .cyber-input:focus { border-color: rgba(0, 200, 255, 0.6); }
        .cyber-input::placeholder { color: rgba(0, 200, 255, 0.2); }
        .login-btn {
          width: 100%;
          margin-top: 16px;
          padding: 10px;
          border: 1px solid rgba(0, 200, 255, 0.4);
          border-radius: 8px;
          background: rgba(0, 200, 255, 0.08);
          color: #00c8ff;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.15em;
          cursor: pointer;
          transition: all 0.2s;
          font-family: "Courier New", monospace;
        }
        .login-btn:hover {
          background: rgba(0, 200, 255, 0.18);
          border-color: rgba(0, 200, 255, 0.7);
        }
        .login-btn:active { transform: scale(0.98); }
        .err-msg {
          font-size: 10px;
          color: #ff5b5b;
          margin-top: 8px;
          text-align: center;
          min-height: 14px;
        }

        /* ===== OAuth (SIGN UP 탭) ===== */
        .oauth-stack { display: flex; flex-direction: column; gap: 8px; }
        .oauth-intro {
          margin-bottom: 4px;
          padding-bottom: 10px;
          border-bottom: 1px dashed rgba(0, 200, 255, 0.12);
        }
        .oauth-intro-title {
          font-size: 12px;
          color: #00c8ff;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .oauth-intro-sub {
          font-size: 10px;
          color: rgba(180, 210, 240, 0.55);
          letter-spacing: 0.04em;
          line-height: 1.5;
        }
        .oauth-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 9px;
          cursor: pointer;
          transition: border-color 0.18s, background 0.18s, transform 0.12s, box-shadow 0.18s;
          font-family: "Courier New", monospace;
          letter-spacing: 0.06em;
          border: 1px solid rgba(0, 200, 255, 0.25);
          background: rgba(0, 200, 255, 0.04);
          color: #d8eaff;
        }
        .oauth-btn :global(span) { flex: 1; text-align: left; }
        .oauth-btn:hover:not(:disabled) {
          border-color: rgba(0, 200, 255, 0.6);
          background: rgba(0, 200, 255, 0.1);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(0, 200, 255, 0.12);
        }
        .oauth-btn:disabled { opacity: 0.55; cursor: wait; transform: none; }
        .oauth-btn.google {
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.04);
        }
        .oauth-btn.google:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.08);
        }
        .oauth-btn.discord {
          border-color: rgba(88, 101, 242, 0.5);
          background: rgba(88, 101, 242, 0.12);
          color: #c8d2ff;
        }
        .oauth-btn.discord:hover:not(:disabled) {
          border-color: #5865f2;
          background: rgba(88, 101, 242, 0.22);
          box-shadow: 0 4px 16px rgba(88, 101, 242, 0.32);
        }
        .oauth-btn.email {
          border-style: dashed;
          color: rgba(0, 200, 255, 0.7);
          background: transparent;
        }
        .oauth-btn.email:hover:not(:disabled) {
          background: rgba(0, 200, 255, 0.05);
        }
        .oauth-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 4px 0;
          color: rgba(0, 200, 255, 0.3);
          font-size: 9px;
          letter-spacing: 0.25em;
          text-align: center;
        }
        .oauth-divider :global(span) { flex-shrink: 0; }
        .oauth-divider::before,
        .oauth-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(0, 200, 255, 0.12);
        }
        .oauth-foot {
          font-size: 9px;
          color: rgba(0, 200, 255, 0.35);
          text-align: center;
          margin-top: 8px;
          line-height: 1.6;
          letter-spacing: 0.04em;
        }
        .oauth-link {
          color: rgba(0, 200, 255, 0.6);
          cursor: pointer;
          text-decoration: underline dotted;
          text-underline-offset: 2px;
        }
        .oauth-link:hover { color: #00c8ff; }

        .unlock-screen {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: #040a14;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s;
        }
        .unlock-screen.show { opacity: 1; pointer-events: all; }

        @media (max-width: 720px) {
          .hero { flex-direction: column; }
          .hero-right { width: 100%; display: flex; justify-content: center; }
          .cards-row { grid-template-columns: 1fr; }
          .nav-links { display: none; }
        }
      `}</style>
    </div>
  );
}

function FeatCard({ name, desc, bar, icon }) {
  return (
    <div className="feat-card">
      <div className="feat-icon">{icon}</div>
      <div className="feat-name">{name}</div>
      <div className="feat-desc">{desc}</div>
      <div className="feat-bar-wrap">
        <div className="feat-bar" style={{ width: `${bar}%` }} />
      </div>
      <style jsx>{`
        .feat-card {
          border: 1px solid rgba(0, 200, 255, 0.12);
          border-radius: 10px;
          background: rgba(0, 200, 255, 0.03);
          padding: 18px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .feat-card:hover {
          border-color: rgba(0, 200, 255, 0.35);
          transform: translateY(-2px);
        }
        .feat-icon {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(0, 200, 255, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        .feat-name {
          font-size: 12px;
          font-weight: 500;
          color: #a8d4f0;
          margin-bottom: 4px;
          letter-spacing: 0.05em;
        }
        .feat-desc {
          font-size: 10px;
          color: rgba(140, 180, 210, 0.6);
          line-height: 1.5;
        }
        .feat-bar-wrap {
          margin-top: 12px;
          height: 2px;
          background: rgba(0, 200, 255, 0.1);
          border-radius: 1px;
        }
        .feat-bar {
          height: 2px;
          border-radius: 1px;
          background: #00c8ff;
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.6 4.6 1.78l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.61l3.99 3.09C6.21 6.92 8.87 4.75 12 4.75z"
      />
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.45c-.28 1.45-1.13 2.68-2.41 3.5l3.71 2.88c2.17-2 3.74-4.94 3.74-8.62z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.07 7.07 0 0 1 4.92 12c0-.79.13-1.55.36-2.29L1.28 6.61A11.96 11.96 0 0 0 0 12c0 1.92.46 3.74 1.28 5.39l3.99-3.1z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.71-2.88c-1.05.7-2.39 1.12-4.22 1.12-3.13 0-5.79-2.17-6.73-5.04l-3.99 3.1C3.26 21.31 7.31 24 12 24z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
      <path d="M19.27 5.33A18.06 18.06 0 0 0 14.93 4l-.21.41a13.6 13.6 0 0 1 4.04 1.99 13.5 13.5 0 0 0-13.52 0 13.6 13.6 0 0 1 4.04-1.99L9.07 4a18.06 18.06 0 0 0-4.34 1.33C2.06 9.4 1.32 13.36 1.69 17.27a18.27 18.27 0 0 0 5.6 2.83l.43-.61c-.94-.34-1.83-.78-2.66-1.33.22-.16.44-.33.65-.51 4.95 2.32 10.31 2.32 15.2 0 .21.18.43.35.65.51-.83.55-1.72.99-2.66 1.33l.43.61a18.27 18.27 0 0 0 5.6-2.83c.46-4.5-.78-8.42-3.66-11.94zM8.52 14.78c-1.07 0-1.94-.99-1.94-2.21s.86-2.21 1.94-2.21 1.96.99 1.94 2.21c0 1.22-.86 2.21-1.94 2.21zm6.96 0c-1.07 0-1.94-.99-1.94-2.21s.86-2.21 1.94-2.21 1.96.99 1.94 2.21c0 1.22-.86 2.21-1.94 2.21z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function OcrIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke={C} strokeWidth="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke={C} strokeWidth="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke={C} strokeWidth="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke={C} strokeWidth="0.5" strokeDasharray="2 1" />
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <polyline points="2,12 5,7 8,9 11,4 14,6" stroke={C} strokeWidth="1" fill="none" />
      <circle cx="14" cy="6" r="1.5" fill={C} />
    </svg>
  );
}
function TriangleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <polygon points="8,2 14,14 2,14" stroke={C} strokeWidth="1" fill="rgba(0,200,255,0.08)" />
      <line x1="8" y1="6" x2="8" y2="10" stroke={C} strokeWidth="1" />
      <circle cx="8" cy="12" r="0.8" fill={C} />
    </svg>
  );
}

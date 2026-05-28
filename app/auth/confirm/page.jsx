'use client';

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("로그인 처리 중…");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const rawNext = searchParams.get("next") || "/dashboard";
      const next =
        rawNext.startsWith("/") && !rawNext.startsWith("//")
          ? rawNext
          : "/dashboard";

      const { getBrowserSupabase } = await import("@/lib/supabase-browser");
      const supa = getBrowserSupabase();

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const { data: { user }, error } = await supa.auth.getUser();
        if (!cancelled && user?.id && !error) {
          setMessage("대시보드로 이동합니다…");
          router.replace(next);
          router.refresh();
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!cancelled) {
        setMessage("세션을 확인할 수 없습니다. 다시 로그인해 주세요.");
        router.replace("/?login=1");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080c14",
        color: "#00c8ff",
        fontFamily: "'Courier New', monospace",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#080c14",
            color: "#00c8ff",
          }}
        >
          로그인 처리 중…
        </div>
      }
    >
      <AuthConfirmInner />
    </Suspense>
  );
}

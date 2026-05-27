'use client';

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ToastContext = createContext(null);

export const LOGIN_REQUIRED_TOAST = "로그인 후 이용 가능한 기능입니다.";

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setMessage(msg);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3200);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: 10,
            background: "rgba(8, 18, 32, 0.96)",
            border: "1px solid rgba(0, 200, 255, 0.35)",
            color: "#e8f4ff",
            fontSize: 13,
            fontFamily: "'Courier New', monospace",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            maxWidth: "min(90vw, 420px)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg) => {
        if (typeof window !== "undefined") console.warn("[Toast]", msg);
      },
    };
  }
  return ctx;
}

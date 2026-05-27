'use client';

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BillingPlans } from "@/components/billing/BillingPlans";
import { useOptionalGuildInsight } from "@/context/GuildInsightProvider";
import { THEMES } from "@/lib/theme";
import { ToastProvider, useToast, LOGIN_REQUIRED_TOAST } from "@/components/shared/Toast";

function BillingPageInner() {
  const ctx = useOptionalGuildInsight();
  const t = ctx?.t ?? THEMES.dark;
  return <BillingPlans t={t} />;
}

function BillingAuthToast() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  useEffect(() => {
    if (searchParams.get("auth") === "required") {
      showToast(LOGIN_REQUIRED_TOAST);
    }
  }, [searchParams, showToast]);

  return null;
}

export default function BillingPage() {
  return (
    <ToastProvider>
      <BillingAuthToast />
      <BillingPageInner />
    </ToastProvider>
  );
}

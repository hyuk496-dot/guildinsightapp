'use client';

import Link from "next/link";

const linkClass =
  "text-slate-400 hover:text-white transition-colors duration-200 no-underline";

export function LandingFooter() {
  return (
    <footer className="bg-[#030712]/50 border-t border-slate-900 w-full py-10 px-6 mt-20 text-sm text-slate-400">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="text-white font-bold text-base mb-2">Guild Insight</div>
          <p className="m-0 leading-relaxed">AI-powered guild analytics platform.</p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-slate-500 text-xs uppercase tracking-wider mb-1">Links</span>
          <a href="mailto:support@guildinsight.app" className={linkClass}>
            Contact
          </a>
          <a
            href="https://discord.gg"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Discord
          </a>
          <Link href="/billing" className={linkClass}>
            Privacy Policy
          </Link>
          <Link href="/billing" className={linkClass}>
            Terms of Service
          </Link>
        </div>
        <div className="flex flex-col gap-1 md:text-right">
          <span>© 2026 Guild Insight</span>
          <span>Built by Donghe Han.</span>
          <span className="text-slate-500">Powered by Next.js &amp; OpenAI.</span>
        </div>
      </div>
    </footer>
  );
}

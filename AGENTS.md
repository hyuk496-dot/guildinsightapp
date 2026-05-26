# Guild Insight — Frontend (Next.js App Router)

라우팅은 `GUILD_INSIGHT_PROJECT.md` §3 기준.

| 경로 | 페이지 키 | 컴포넌트 | 진입 |
|------|-----------|----------|------|
| `/dashboard` | dashboard | Dashboard | 사이드바 |
| `/guild` | guild | GuildManagement | 사이드바 |
| `/members` | members | MemberManagement | 사이드바 |
| `/scores` | scores | ScoreManagement | 사이드바 |
| `/contribution` | contribution | ContribAnalysis | 사이드바 |
| `/simulation` | simulation | RankingSimulation | 사이드바 |
| `/gptreport` | gptreport | GPTReport | 사이드바 |
| `/ocr/upload` | ocr_upload | OcrImageUpload | **Topbar OCR** |
| `/ocr` | ocr | OcrUpload | **사이드바 OCR**, 스캔 완료 후 |

전역 상태: `context/GuildInsightProvider.jsx` (`contents`, `ocrSession` 등).

개발: `cd guildinsightapp && npm run dev` 또는 repo 루트 `npm run dev`.

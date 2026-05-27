import { DemoShell } from "@/components/demo/DemoShell";

export const metadata = {
  title: "Guild Insight — 데모 체험",
  description: "Mock 데이터 기반 대시보드 데모 체험",
};

export default function DemoLayout({ children }) {
  return <DemoShell>{children}</DemoShell>;
}

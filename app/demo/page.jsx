import { redirect } from "next/navigation";

/** /demo → 대시보드 데모 진입점 */
export default function DemoIndexPage() {
  redirect("/demo/dashboard");
}

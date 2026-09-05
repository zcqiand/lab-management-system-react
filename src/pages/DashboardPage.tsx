// DashboardPage — V016 菜单路径对齐（Sprint 2 Batch 2B-5 收口）。
//
// saas /me/menus 下发 lab 仪表盘菜单 path=dashboard（code=m-lab-dash，
// 顶层 leaf，parent_id NULL）。lab-react 在 `/` 与 `/dashboard` 同渲染
// SummaryList —— 即 M05.F01.I01 报告汇总表 + I02 仪表盘统计卡片（5 卡）。
//
// legacy 路径 `/` 与别名 `/dashboard` 同时保留；SummaryPage(`/summary`) 也
// 复用同一组件（与 lab-nextjs 的 dashboard/page.tsx 同构）。
import { SummaryList } from "@/features/summary/SummaryList";

export function DashboardPage() {
  return <SummaryList />;
}

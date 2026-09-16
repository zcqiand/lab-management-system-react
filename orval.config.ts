import { defineConfig } from "orval";

// orval config (in react 仓) — generates TS api-client from shared's OpenAPI.yaml.
// Source contract: ../lab-management-system-shared/generated/openapi/openapi.yaml.
//
// Architecture (spec §2.1, saas-react PR #8 pilot):
// - mode: "tags-split" — 按 shared tsp 的 @tag 拆成多文件，schemas 抽到 model/ 子目录
// - target: 目录（不是文件）—— orval tags-split 必须 dir，不能 file
// - schemas: 单独 model/ 目录—— schemas 跨 tag 复用，集中放便于 import + tree-shaking
//
// 原配置：mode="split" + target 是文件 → orval 实际等同于 single，全塞 endpoints.ts。
// 弊端（spec §0）：
//   1. 单文件 3000+ 行，IDE 卡顿 + 类型检查慢
//   2. 多人协作 git merge conflict 重灾区
//   3. tree-shaking 失效，bundle 大
//   4. shared 删 namespace → 整文件失效 → orphan pages 编译失败但 grep 不到原因
//
// 此文件 owned by react 仓；其他前端（vue / nextjs）有自己独立副本。
export default defineConfig({
  lab: {
    input: {
      target: "../lab-management-system-shared/generated/openapi/openapi.yaml",
      // frontend-bind-meta 是 shared 仓的 emit-only 锚点（把 8 个契约 schema 拉进
      // components.schemas），后端不实现该端点 — exclude 掉，避免生成一个调用必
      // 404 的 stub。8 个契约类型仍写进 model/，入口在 src/api/contracts.ts。
      filters: {
        mode: "exclude",
        tags: ["frontend-bind-meta"],
      },
    },
    output: {
      mode: "tags-split",
      target: "./src/api/endpoints",
      schemas: "./src/api/endpoints/model",
      client: "react-query",
      override: {
        useDates: false,
        query: {
          useQuery: true,
          useInfinite: false,
          useSuspenseQuery: false,
          signal: true,
        },
      },
    },
  },
});
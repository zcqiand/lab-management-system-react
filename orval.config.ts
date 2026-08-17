import { defineConfig } from "orval";

// orval config (in react 仓) — generates TS api-client from shared's OpenAPI.yaml.
// Source contract: ../lab-management-system-shared/generated/openapi/openapi.yaml.
export default defineConfig({
  lab: {
    input: {
      target: "../lab-management-system-shared/generated/openapi/openapi.yaml",
      // frontend-bind-meta 是 shared 仓的 emit-only 锚点（把 8 个契约 schema 拉进
      // components.schemas），后端不实现该端点 — exclude 掉，避免生成一个调用必
      // 404 的 stub。8 个契约类型仍写进 endpoints.schemas.ts，入口在 src/api/contracts.ts。
      filters: {
        mode: "exclude",
        tags: ["frontend-bind-meta"],
      },
    },
    output: {
      mode: "split",
      target: "./src/api/endpoints/endpoints.ts",
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

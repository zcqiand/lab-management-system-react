import { defineConfig } from "orval";

// orval config (in react 仓) — generates TS api-client from shared's OpenAPI.yaml.
// Source contract: ../lab-management-system-shared/generated/openapi/openapi.yaml.
export default defineConfig({
  lab: {
    input: "../lab-management-system-shared/generated/openapi/openapi.yaml",
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

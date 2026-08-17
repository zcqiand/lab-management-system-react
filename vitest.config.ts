import path from "node:path";
import { defineConfig } from "vitest/config";
import FnReporter from "./tests/fnReporter";

/**
 * 双环境约定（照 nextjs 仓模式，Sprint 2 Batch 0 起）：
 *   - `*.dom.test.{ts,tsx}` 走 jsdom project（RTL + tests/setup.dom.ts 的
 *     msw node server）；其余 node project（纯逻辑）。
 *   - node 环境的纯逻辑测试也可能 import .tsx 组件源文件（取纯函数），
 *     同样需要 oxc JSX 转译。**必须放 project 级（test 外层）**——
 *     vitest 4 每个 project 自建 vite server，顶层 jsx 字段会被 cli-api
 *     重建覆盖丢掉（nextjs 仓踩过，勿"简化"）。
 */
const resolveAlias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: resolveAlias },
        oxc: { jsx: { runtime: "automatic" } },
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.{ts,tsx}"],
          exclude: ["tests/**/*.dom.test.{ts,tsx}"],
          testTimeout: 10000,
        },
      },
      {
        resolve: { alias: resolveAlias },
        oxc: { jsx: { runtime: "automatic" } },
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["tests/**/*.dom.test.{ts,tsx}"],
          setupFiles: ["tests/setup.dom.ts"],
          testTimeout: 10000,
        },
      },
    ],
    reporters: ["default", new FnReporter() as never],
  },
});

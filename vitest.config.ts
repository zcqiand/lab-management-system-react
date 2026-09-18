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
          // 与 jsdom 项目分序列组：vitest 4 要求不同 maxWorkers 的项目必须
          // 不同组（同组会抛 "different 'maxWorkers' but same 'sequence.
          // groupOrder'"）。node 组(0)先跑，jsdom 组(1)后跑。
          sequence: { groupOrder: 0 },
          testTimeout: 10000,
        },
      },
      {
        resolve: { alias: resolveAlias },
        oxc: { jsx: { runtime: "automatic" } },
        test: {
          name: "jsdom",
          environment: "jsdom",
          globalSetup: ["./tests/global-setup.ts"],
          include: ["tests/**/*.dom.test.{ts,tsx}"],
          setupFiles: ["tests/setup.dom.ts"],
          // jsdom url 与真后端 :5201 同源——jsdom 的 XHR 对跨源响应按网络错误
          // 处理（实测 baseUrl=:5201 + 默认 url 时 dom 测试全挂）；同源化后
          // msw wildcard 拦截（过渡期）与 T8/T9 真链路请求两不误。
          environmentOptions: { jsdom: { url: "http://localhost:5201" } },
          // dom 文件全并行（默认 worker 数 = CPU-1）会把共享 :5201 dev server
          // + 远端 PG（RTT ~240ms）压出 12-21s 的 /api/inspection/objects 排队
          // 延迟，偶发超 30s asyncUtilTimeout → 每轮换受害者的假红（2026-09-18
          // 三轮实证：规格维护/牌号维护/报告阶段页各挂一次，隔离跑全绿）。
          // 限并发是家族「dom 测试对共享后端串行化」原则的仓内落点——只收敛
          // 调度，不跳过、不放宽任何断言（vitest 4 项目级 maxWorkers 优先于根配置）。
          maxWorkers: 4,
          sequence: { groupOrder: 1 },
          testTimeout: 10000,
        },
      },
    ],
    reporters: ["default", new FnReporter() as never],
  },
});

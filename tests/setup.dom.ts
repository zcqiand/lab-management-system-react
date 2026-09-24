/**
 * jsdom 环境专属 setup：RTL 清理 + 每用例 localStorage 复位。
 *
 * msw node server 已随 msw 剔除 Phase 2 拆除（T8/T9 两批 dom 测试全部切真，
 * 直连真 nextjs :5201，见 tests/helpers/real-chain.ts）——本文件只留 jsdom 样板。
 *
 * vitest environmentMatchGlobs 命中 jsdom 的测试（*.dom.test.tsx / *.dom.test.ts）
 * 才会真正用到这里的 window；node 环境测试同样会执行本文件 ——
 * 所以必须先判 `typeof window !== "undefined"` 再装 jsdom 专属逻辑。
 */
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

if (typeof window !== "undefined") {
  // RTL 默认 asyncUtilTimeout=1s：waitFor/getBy 的隐式等待窗口。全量并发
  // 负载下真链路请求实测远超 1s（categoryDictPages 标题断言在 PageLoading
  // 门控 + 两轮远程 PG 后才出现），是 L4 flake 的系统性来源 —— 统一抬高到
  // 20s；各测试显式传的 timeout（45s/60s/90s）不受影响。
  configure({ asyncUtilTimeout: 20_000 });
  afterEach(() => {
    localStorage.clear();
    cleanup();
  });
}

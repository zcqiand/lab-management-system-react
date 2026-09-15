import { test as base } from "vitest";

// 扩展 vitest 的 TaskMeta，让 fn 成为一等类型。
// 不用 any 绕过 —— 适配器不能豁免于它所服务的规则。
declare module "vitest" {
  interface TaskMeta {
    fn?: string[];
  }
}

/**
 * 声明该测试验证的功能子项 ID。
 *
 * 契约：被 skip 的测试不会执行，meta 就永远写不进去 —— 假绿在物理上不可能发生。
 * 这不是靠纪律，是靠机制。
 *
 *   fnTest(["M01.F01.I03"], "超出宽限判定为迟到", () => { ... });
 *
 * 纪律部分（机器管不了的）：
 *   - 只在测试直接验证该子项可观察行为时才挂 ID
 *   - 间接受益不挂
 *   - 工程设施的测试不挂任何业务 ID
 *   - 一个测试挂 3 个以上 ID，通常说明它测得太宽
 */
export function fnTest(
  ids: string[],
  name: string,
  bodyOrOptions: (() => void | Promise<void>) | { timeout?: number },
  maybeBody?: () => void | Promise<void>,
) {
  // 真链路 dom 测试（T8/T9）首跑可能撞 nextjs 惰性编译，需要个别 it 显式放宽
  // timeout（probe14 教训）——可选第 3 参数 options 形式；不传时行为与原签名
  // 完全一致（禁全文件放宽）。
  const timeout = typeof bodyOrOptions === "object" ? bodyOrOptions.timeout : undefined;
  const body = typeof bodyOrOptions === "function" ? bodyOrOptions : maybeBody!;
  return base(
    name,
    (ctx) => {
      ctx.task.meta.fn = ids;
      return body();
    },
    timeout,
  );
}

import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * 能被机器判定的性能规则一律落在这里，不留在 markdown。
 * 提示词里的禁令靠自觉，eslint 里的禁令靠 exit code。
 *
 * 每条规则后面标注它对应 Vercel 规则集的哪一条。
 * 判断类的规则（瀑布流、bundle 拆分、memo 边界）eslint 看不见，
 * 它们在 .claude/skills/react-perf/ 与 docs/conventions/react-perf.md。
 */
export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage"] },
  ...tseslint.configs.recommended,
  {
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      // 项目 CLAUDE.md 的硬约束
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",

      // rerender-no-inline-components
      "react/no-unstable-nested-components": "error",

      // rerender-dependencies / advanced-effect-event-deps
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // bundle-barrel-imports：直接导入，别走 barrel
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/index", "**/index.ts", "**/index.tsx"],
              message:
                "bundle-barrel-imports: 直接导入具体模块，barrel 文件会把整个目录拖进 bundle。",
            },
            {
              group: ["lodash", "@mui/icons-material", "date-fns"],
              message:
                "bundle-barrel-imports: 从子路径导入，如 lodash/debounce。",
            },
          ],
        },
      ],

      // 设计一致性：禁止裸颜色逃出语义 token（design-tokens-only）。
      // 只用 index.css 里的 bg-primary / text-muted-foreground 等，不许 bg-[#3b82f6]。
      // 判断类的设计规则（三态、密度、层级）eslint 看不见，
      // 它们在 .claude/skills/app-ui/ 与 docs/conventions/app-ui.md。
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/-\\[#[0-9a-fA-F]{3,8}\\]/]",
          message:
            "design-tokens-only: 禁止裸 hex 颜色（如 bg-[#3b82f6]）。用 index.css 的语义 token：bg-primary / text-muted-foreground / border-input 等。",
        },
        {
          selector: "Literal[value=/\\b(rgb|rgba|hsl|hsla)\\(/]",
          message:
            "design-tokens-only: 禁止行内 rgb/hsl 颜色。用 index.css 的语义 token，或在 index.css 新增 token。",
        },
      ],

      // js-tosorted-immutable / rendering-conditional-render 等靠 code review
    },
  },
  {
    // 适配器与配置文件不受业务规则约束，但仍禁 any
    files: ["tests/fnReporter.ts", "tests/fn.ts", "vitest.config.ts"],
    rules: { "react-hooks/exhaustive-deps": "off" },
  },
);

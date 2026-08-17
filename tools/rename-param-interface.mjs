// tools/rename-param-interface.mjs
//
// 一次性迁移：把 "param-interface" 全部加 "inspection-" 前缀，对齐同模块其他表。
//   paramInterface         (var/type camelCase) → inspectionParamInterface
//   ParamInterface         (type PascalCase)    → InspectionParamInterface
//   paramInterfaces        → inspectionParamInterfaces
//   paramInterfaceCode     → inspectionParamInterfaceCode
//   getParamInterface      → getInspectionParamInterface
//   /param-interfaces      → /inspection-param-interfaces
//   /param-interface       → /inspection-param-interface
//
// 重要：单词边界匹配，避免误伤 inspectionParameterCode / inspectionParameters 等。

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src");
const TESTS = resolve(__dirname, "../tests");

const REPLACEMENTS = [
  // 0. 反向修正：先把多余的 inspection-inspection- / inspection-inspection 还原成单层
  [/\/inspection-inspection-/g, "/inspection-"],
  // 1. URL slugs (file paths + endpoints) — 用负向预查避开已加 inspection- 前缀的字符串
  [/(?<![a-zA-Z-])\/param-interfaces\b/g, "/inspection-param-interfaces"],
  [/(?<![a-zA-Z-])\/param-interface\b/g, "/inspection-param-interface"],
  [/(?<![a-zA-Z-])param-interfaces\b/g, "inspection-param-interfaces"],
  [/(?<![a-zA-Z-])param-interface\b/g, "inspection-param-interface"],

  // 2. Type/Variable identifiers (PascalCase 先于 camelCase)，同样加负向预查避免重复前缀
  [/(?<![A-Za-z])ParamInterface\b/g, "InspectionParamInterface"],
  [/(?<![A-Za-z])paramInterfaceLinks\b/g, "inspectionParamInterfaceLinks"],
  [/(?<![A-Za-z])paramInterfaces\b/g, "inspectionParamInterfaces"],
  [/(?<![A-Za-z])getParamInterface\b/g, "getInspectionParamInterface"],
  [/(?<![A-Za-z])paramInterfaceCode\b/g, "inspectionParamInterfaceCode"],
  [/(?<![A-Za-z])paramInterface\b/g, "inspectionParamInterface"],
];

let touched = 0;
let totalChanges = 0;
function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "templates") continue;
    const p = resolve(dir, entry.name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      walk(p);
    } else if (st.isFile() && /\.(ts|tsx|js|mjs|json)$/.test(entry.name)) {
      const orig = readFileSync(p, "utf8");
      let next = orig;
      let n = 0;
      for (const [pat, rep] of REPLACEMENTS) {
        const matches = next.match(pat);
        if (matches) {
          n += matches.length;
          next = next.replace(pat, rep);
        }
      }
      if (n > 0) {
        writeFileSync(p, next, "utf8");
        touched += 1;
        totalChanges += n;
        console.log(`  ${p.replace(SRC + "\\", "")}: ${n} 处替换`);
      }
    }
  }
}

console.log("[rename] 扫描 lab-msw/src/ ...");
walk(SRC);
console.log("[rename] 扫描 lab-msw/tests/ ...");
walk(TESTS);
console.log(`[rename] 改写 ${touched} 个文件，合计 ${totalChanges} 处替换`);

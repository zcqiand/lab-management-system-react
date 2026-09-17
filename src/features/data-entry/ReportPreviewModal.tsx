import { useEffect, useRef, useState } from "react";
import { samplesListSamples, samplesUpdateSampleExt } from "@/api/endpoints/samples/samples";
import { testRecordsListTestRecords } from "@/api/endpoints/test-records/test-records";
import type { SampleReceipt } from "@/api/endpoints/model/sampleReceipt";
import type { Sample } from "@/api/endpoints/model/sample";
import type { TestRecord } from "@/api/endpoints/model/testRecord";
import type { ExtFieldDef } from "@/api/endpoints/model/extFieldDef";
import generatedReportNames from "@/data/generated/inspection-report-name.json";
import {
  assembleReport,
  flattenForDocx,
  ensureAllDocxTagsFromBuffer,
  type OrgInfo,
} from "./reportTemplateData";
import { SampleExtFieldsModal } from "./SampleExtFieldsModal";

/**
 * 按样品归集检测记录——契约 list 端点只支持 sampleId/parameterCode 过滤
 * （无 receiptId 参数），对样品集合逐个取再合并。
 */
async function recordsOfSamples(sampleIds: string[]): Promise<TestRecord[]> {
  const pages = await Promise.all(
    sampleIds.map((id) =>
      testRecordsListTestRecords({ sampleId: id, page: 1, pageSize: 200 }).catch(
        () => null,
      ),
    ),
  );
  return pages.flatMap((p) => p?.data?.items ?? []);
}

/** 报告编号(RN) → 模板文件名（来自 generated/inspection-report-name.json 的 templatePath）。
 *  30 个 RN 全部已注入占位符并具备 templatePath。 */
const REPORT_NAME_TEMPLATE: Record<string, string> = Object.fromEntries(
  (generatedReportNames as Array<{ code: string; templatePath?: string }>)
    .filter((r) => r.templatePath)
    .map((r) => [r.code, r.templatePath as string]),
);

/** 报告编号(RN) → public/templates 下的模板 URL。
 *  REF（vite）用 import.meta.glob 把 data/templates/*.docx 发布成静态资源；
 *  Next.js 移植：30 个 docx 已镜像到 public/templates/（与 templatePath 一一对应），
 *  直接按文件名构 URL，无需 glob 查找表。无 templatePath 的类别返回 null →
 *  组件走「暂无报告模板」分支。
 *  导出供测试断言 URL 直构行为（tests/features/data-entry/reportTemplateUrl.test.ts）。 */
export function pickTemplateUrl(categoryCode: string): string | null {
  const fname = REPORT_NAME_TEMPLATE[categoryCode];
  return fname ? `/templates/${encodeURIComponent(fname)}` : null;
}

interface Props {
  open: boolean;
  receipt: SampleReceipt;
  onClose: () => void;
}

/** 报告预览：docxtemplater 填充 → docx-preview 渲染 → 打印/套打。
 * 纯前端链路：模板取自 data/templates，浏览器内替换占位符，无后端。
 * 当前报告类别无模板时，提示「没有报告模板」。 */
export function ReportPreviewModal({ open, receipt, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noTemplate, setNoTemplate] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [overlay, setOverlay] = useState(false);
  // 类别级扩展属性补录弹窗（M03.F01.I07）：当 reportName.extFields 非空且当前样品
  // 未覆盖对应 key 时，先弹补录窗，提交后再渲染预览。
  const [extModalOpen, setExtModalOpen] = useState(false);
  const [extDraftReady, setExtDraftReady] = useState<Record<string, string> | null>(null);
  const [extDraftSample, setExtDraftSample] = useState<Sample | null>(null);
  const [extDraftFields, setExtDraftFields] = useState<ExtFieldDef[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setError(null);
      const templateUrl = pickTemplateUrl(receipt.categoryCode);
      if (!templateUrl) {
        setNoTemplate(true);
        setLoading(false);
        return;
      }
      setNoTemplate(false);
      setLoading(true);
      try {
        // 样品 + 模板文件 并发拉取；检测记录按样品归集（见 recordsOfSamples）。
        // 机构信息：契约无 org-info 端点（GAP），org 恒 null，模板机构字段留空。
        const [samples, tplRes] = await Promise.all([
          samplesListSamples({ receiptId: receipt.id, page: 1, pageSize: 100 })
            .then((r) => r.data.items ?? [])
            .catch(() => [] as Sample[]),
          fetch(templateUrl),
        ]);
        if (!tplRes.ok) throw new Error("模板加载失败：" + tplRes.status);
        const records = await recordsOfSamples(samples.map((s) => s.id));
        const org: OrgInfo | null = null;

        // 类别级扩展属性补录决策：当前类别若有 extFields 且首个样品未覆盖，
        // 弹窗先开；保存后再继续渲染。
        // 种子 JSON 的 extFields 条目可能省略 type（契约 ExtFieldDef.type 必填），
        // 边界处归一为 "text"（与 SampleExtFieldsModal 的 `f.type ?? "text"` 同语义）。
        const rname = (
          generatedReportNames as Array<{
            code: string;
            extFields?: Array<
              Omit<ExtFieldDef, "type"> & { type?: ExtFieldDef["type"] }
            >;
          }>
        ).find((r) => r.code === receipt.categoryCode);
        const extFields: ExtFieldDef[] = (rname?.extFields ?? []).map((f) => ({
          ...f,
          type: f.type ?? "text",
        }));
        const firstSample = samples[0] ?? null;
        const needExt =
          extFields.length > 0 &&
          !!firstSample &&
          extFields.some(
            (f) => f.source !== "receipt" && !(firstSample.ext && firstSample.ext[f.key]),
          );
        if (needExt && firstSample) {
          setExtDraftFields(extFields);
          setExtDraftSample(firstSample);
          setExtDraftReady(firstSample.ext ?? {});
          setExtModalOpen(true);
          setLoading(false);
          return;
        }

        if (cancelled) return;
        await renderPreview({ templateUrl, samples, records, org, receipt });
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "预览失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [open, receipt]);

  async function renderPreview({
    templateUrl,
    samples,
    records,
    org,
    receipt: rcpt,
  }: {
    templateUrl: string;
    samples: Sample[];
    records: TestRecord[];
    org: OrgInfo | null;
    receipt: SampleReceipt;
  }): Promise<void> {
    const tplRes = await fetch(templateUrl);
    if (!tplRes.ok) throw new Error("模板加载失败：" + tplRes.status);
    const arrayBuffer = await tplRes.arrayBuffer();
    // 预览合成：模板（103/104/110 等）的「样品名称」cell 来自 sample.sampleName，
    // 但用户在样品管理里实际录入的是 型号 / 等级 / 牌号（sample.model/grade/brand），
    // 这两个字段对不上 → 预览跟数据录入「压根不匹配」。
    // 这里把首样品的 sampleName 合成成 `${model} ${grade} ${brand}`，
    // 优先取 sample.ext.sampleModel/sampleGrade/sampleBrand（extFields 补录的），
    // 再回退到 sample 内建字段，最后才用 sampleName 原值。
    // 不改 DB；只改本次预览用的内存对象。
    // 预览合成：模板（103/104/110 等）的「样品名称」cell 来自 sample.sampleName，
    // 但用户在样品管理里实际录入的是 型号 / 等级 / 牌号（sample.model/grade/brand），
    // 这两个字段对不上 → 预览跟数据录入「压根不匹配」。
    // 这里把首样品的 sampleName 合成成 `${model} ${grade} ${brand}`，
    // 优先取 sample.ext.sampleModel/sampleGrade/sampleBrand（extFields 补录的），
    // 再回退到 sample 内建字段，最后才用 sampleName 原值。
    // 不改 DB；只改本次预览用的内存对象。
    // （型号/等级/牌号本身由 SampleManagerModal 收集在 sample.model/grade/brand；
    // 不再作为 InspectionReportName.extFields 由「检测报告名称扩展属性维护」维护——
    // 它们是样品事实，不该走报告类别配置层。）
    const displaySamples = applyComposedSampleName(samples);
    const data = assembleReport({ receipt: rcpt, samples: displaySamples, records, org });
    const fname = REPORT_NAME_TEMPLATE[rcpt.categoryCode];
    const basename = fname ? fname.replace(/\.docx$/, "") : null;
    const flat = flattenForDocx(rcpt.categoryCode, basename, data, displaySamples, records);
    // 兜底：manifest 漏登记的 {tag} 也补成「—」，避免 docxtemplater 渲染 "undefined"。
    await ensureAllDocxTagsFromBuffer(flat, arrayBuffer);
    const PizZip = (await import("pizzip")).default;
    const Docxtemplater = (await import("docxtemplater")).default;
    const { renderAsync } = await import("docx-preview");
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(flat);
    const filled = doc.getZip().generate({ type: "uint8array" });
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    await renderAsync(filled, containerRef.current, undefined, {
      inWrapper: false,
    });
  }

  // 补录提交：合并 ext → 调 PUT /api/samples/:id/ext → 用合并后的 samples 重新渲染。
  async function handleExtSubmit(mergedExt: Record<string, string>): Promise<void> {
    const target = extDraftSample;
    if (!target) {
      setExtModalOpen(false);
      return;
    }
    try {
      setLoading(true);
      await samplesUpdateSampleExt(target.id, { ext: mergedExt });
      const updatedSamples: Sample[] = [{ ...target, ext: mergedExt }];
      const templateUrl = pickTemplateUrl(receipt.categoryCode);
      if (!templateUrl) {
        setExtModalOpen(false);
        setNoTemplate(true);
        return;
      }
      // 重新拉一次该样品的 records（org 契约无端点，恒 null——见 run() 注释）。
      const [records] = await Promise.all([
        recordsOfSamples(updatedSamples.map((s) => s.id)),
      ]);
      await renderPreview({
        templateUrl,
        samples: updatedSamples,
        records,
        org: null,
        receipt,
      });
      setExtModalOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存补录失败");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-70 p-4">
      {/* 打印样式：A4 零边距，仅 #report-print-wrap 可见；预览与打印共用同一偏移。
          套打模式：把 docx-preview 渲染出的表格线透明掉，只留数据，用于打到预印刷空白表单。 */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          #report-print-wrap, #report-print-wrap * { visibility: visible; }
          #report-print-wrap {
            position: fixed; left: 0; top: 0; margin: 0; padding: 0;
            box-shadow: none !important;
          }
        }
        .report-overlay table,
        .report-overlay td,
        .report-overlay th { border-color: transparent !important; }
      `}</style>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[94vh] flex flex-col">
        <header className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-base font-semibold">报告预览{receipt.commissionCode ? ` — ${receipt.commissionCode}` : ''}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </header>

        {noTemplate ? (
          <div className="p-10 text-center text-gray-500">
            当前报告类别（{receipt.categoryCode || "—"}）暂无报告模板。
            <br />
            仅「混凝土抗压强度」类别支持预览，其他报告名称需要先在 data/templates
            下放入对应模板并注入占位符。
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-5 py-2 border-b text-xs text-gray-600 flex-wrap">
              <label className="flex items-center gap-1">
                X 偏移(mm)
                <input
                  type="number"
                  value={offsetX}
                  onChange={(e) => setOffsetX(Number(e.target.value))}
                  className="w-16 border rounded px-1 py-0.5"
                />
              </label>
              <label className="flex items-center gap-1">
                Y 偏移(mm)
                <input
                  type="number"
                  value={offsetY}
                  onChange={(e) => setOffsetY(Number(e.target.value))}
                  className="w-16 border rounded px-1 py-0.5"
                />
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={overlay}
                  onChange={(e) => setOverlay(e.target.checked)}
                />
                套打模式（隐藏表格线，仅打数据）
              </label>
              <div className="flex-1" />
              <span className="text-gray-400">预览与打印共用同一组偏移</span>
            </div>

            {error && (
              <div className="px-5 py-2 text-sm text-red-600 bg-red-50">{error}</div>
            )}

            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {loading && <div className="text-sm text-gray-500 p-4">生成预览中...</div>}
              <div
                id="report-print-wrap"
                className={`mx-auto bg-white shadow ${overlay ? "report-overlay" : ""}`}
                style={{ width: "210mm", minHeight: "297mm" }}
              >
                <div style={{ transform: `translate(${offsetX}mm, ${offsetY}mm)` }}>
                  <div ref={containerRef} className="report-docx-host" />
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-sm border rounded hover:bg-gray-100"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                打印
              </button>
            </footer>
          </>
        )}
      </div>
      <SampleExtFieldsModal
        open={extModalOpen}
        extFields={extDraftFields}
        initialExt={extDraftReady ?? undefined}
        onSubmit={handleExtSubmit}
        onCancel={() => setExtModalOpen(false)}
        loading={loading}
      />
    </div>
  );
}

export default ReportPreviewModal;

/**
 * 预览用：把首个样品的 `sampleName` 合成成 `${model} ${grade} ${brand}`，
 * 直接取 `Sample.model/grade/brand`（SampleManagerModal 已收集）。
 * 兼容：若 ext 仍残留旧 extFields 补录值（sampleModel/sampleGrade/sampleBrand），
 * 优先 ext（历史数据迁移期）。不改 DB；只改本次预览用的内存对象。
 */
export function applyComposedSampleName(samples: Sample[]): Sample[] {
  if (samples.length === 0) return samples;
  const s0 = samples[0]!;
  const ext = (s0 as unknown as { ext?: Record<string, string> }).ext ?? {};
  const model = ext.sampleModel ?? s0.model ?? "";
  const grade = ext.sampleGrade ?? s0.grade ?? "";
  const brand = ext.sampleBrand ?? s0.brand ?? "";
  const composed = [model, grade, brand].filter((p) => p.trim() !== "").join(" ");
  if (!composed) return samples;
  const updated: Sample = { ...s0, sampleName: composed } as Sample;
  return [updated, ...samples.slice(1)];
}

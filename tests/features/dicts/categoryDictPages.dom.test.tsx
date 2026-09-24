import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { fnTest } from "../../fn";
import { installRealChain, SEED } from "../../helpers/real-chain";
import { CategoryDictList } from "@/features/dicts/CategoryDictList";

/**
 * M04.F06-F09 型号/规格/等级/牌号维护 4 页 smoke —— 真链路（
 * 直连真 nextjs :5201，msw 已拆）。
 *
 * GET /api/catalog/{models,specs,grades,brands} 与 /api/inspection/objects 均为
 * DB 参照路由（lab_test 库，Batch1 接真库），返回 {items,page,pageSize,total} +
 * id=code 补列——零适配直连。断言锚 shared 种子：左侧树渲染真实检测项目名，
 * OBJ-SP01-P2（钢筋）下渲染种子牌号/型号行。本批用例只开弹窗不落写，
 * 拖拽排序（dnd-kit）不在 jsdom 冒烟范围。
 */

const P2 = SEED.inspectionObjects.find((o) => o.code === "OBJ-SP01-P2")!;
/** OBJ-SP01-P2 的种子牌号名（字典序首个，固定 id 锚） */
const P2_BRAND_NAME = SEED.inspectionBrands
  .filter((b) => b.inspection_object_code === P2.code)
  .map((b) => b.name)
  .sort()[0]!;

beforeEach(() => {
  installRealChain();
});

describe("M04.F06-F09 码表维护 4 页", () => {
  /** 等左侧检测项目树真实加载（真库 inspection_objects 渲染出可选节点）。
   *  B6 加载态：整页 PageLoading 门控后，树随首屏数据一起出现 → 放宽 waitFor 窗口。 */
  async function waitForTree() {
    await waitFor(
      () => {
        const nodes = document.querySelectorAll("aside ul li button");
        expect(nodes.length).toBeGreaterThan(0);
      },
      { timeout: 30_000 },
    );
  }

  /** 点左侧树「钢筋（含焊接与机械连接）」节点，等右侧列表行渲染。
   *  B6 加载态：树与列表随门控一起出现，节点查找进 waitFor 轮询（真链路
   *  下标题/树/行的提交与断言之间有响应乱序窗口，锚不变）。
   *  5.74 收口实证的点击空打竞态：树首现与选中变化 refetch 的 PageLoading
   *  重门控之间有毫秒级瞬窗，waitFor 在瞬窗里拿到的按钮随树卸载成游离
   *  节点——fireEvent 打在游离节点上，React 根委托收不到，选中原地不动
   *  （真浏览器用户点不到瞬窗里的按钮，非组件 bug，测试侧吸收）。修法：
   *  点击进轮询并验效——每轮看「钢筋」是否已带 active 态（bg-blue-50），
   *  没带就（重）点，点生效才放行走行断言。 */
  async function selectRebarAndAwaitRows() {
    await waitFor(
      () => {
        const btn = [...document.querySelectorAll("aside ul li button")].find((b) =>
          b.textContent?.includes("钢筋"),
        );
        expect(btn).toBeTruthy();
        if (!btn?.className.includes("bg-blue-50")) {
          fireEvent.click(btn as HTMLElement);
        }
        const active = [...document.querySelectorAll("aside ul li button")].some(
          (b) => b.className.includes("bg-blue-50") && b.textContent?.includes("钢筋"),
        );
        expect(active).toBe(true);
      },
      { timeout: 60_000 },
    );
    await waitFor(
      () => {
        expect(screen.getAllByRole("button", { name: "删除" }).length).toBeGreaterThan(0);
      },
      { timeout: 45_000 },
    );
  }

  /** 行内「删除」按钮点击验效：重门控瞬窗里 selectRebarAndAwaitRows 放行后的
   *  二次 getAllByRole（waitFor 之外）拿到的按钮可能随列表 refetch 卸载成
   *  游离节点——fireEvent 打在游离节点上 React 根委托收不到，确认弹窗原地
   *  不开（真浏览器用户点不到瞬窗里的按钮，非组件 bug，测试侧吸收）。修法
   *  同 selectRebarAndAwaitRows 的验效点击：按钮获取、点击、弹窗 h3 验效
   *  进同一轮询，弹窗出现才算点击生效；弹窗已开则不重复点。 */
  async function clickDeleteAndAwaitDialog() {
    await waitFor(
      () => {
        const delBtn = screen.queryAllByRole("button", { name: "删除" })[0];
        if (document.querySelector("h3")?.textContent !== "删除确认") {
          expect(delBtn).toBeTruthy();
          fireEvent.click(delBtn as HTMLElement);
        }
        expect(document.querySelector("h3")?.textContent).toBe("删除确认");
      },
      { timeout: 45_000 },
    );
  }

  fnTest(
    ["M04.F06.I01"],
    "型号维护：渲染标题 + 检测项目树 + 默认选中项目下列表（真库穿透）",
    { timeout: 45_000 },
    async () => {
      render(
        <CategoryDictList endpoint="/models" title="型号维护" dataFn="M04.F06.I01" />,
      );
      // B6 加载态：整页 PageLoading 门控后，标题随数据一起出现 → 并入 waitForTree
      await waitFor(() => {
        expect(screen.getByText("型号维护")).toBeTruthy();
      });
      await waitForTree();
      // 种子锚：默认选中首个检测项目（水泥），其下种子型号行渲染（真库 1 行）
      await waitFor(() => {
        expect(
          document.querySelectorAll('[data-testid="/models-list"] li').length,
        ).toBeGreaterThan(0);
      });
    },
  );

  fnTest(["M04.F07.I01"], "规格维护：渲染标题不炸", { timeout: 45_000 }, async () => {
    render(
      <CategoryDictList
        endpoint="/specifications"
        title="规格维护"
        dataFn="M04.F07.I01"
      />,
    );
    // B6 加载态：整页 PageLoading 门控后，标题随数据一起出现 → 并入 waitForTree
    await waitFor(() => {
      expect(screen.getByText("规格维护")).toBeTruthy();
    });
    await waitForTree();
  });

  fnTest(["M04.F08.I01"], "等级维护：渲染标题不炸", { timeout: 45_000 }, async () => {
    render(<CategoryDictList endpoint="/grades" title="等级维护" dataFn="M04.F08.I01" />);
    await waitFor(() => {
      expect(screen.getByText("等级维护")).toBeTruthy();
    });
    await waitForTree();
  });

  fnTest(
    ["M04.F09.I01"],
    "牌号维护：牌号种子行渲染（真库 OBJ-SP01-P2 种子穿透）",
    // 检测项目树（111 行）+ 牌号列表（35 行）两轮远程 PG 请求，全量并发下
    // 实测 24-26s，当晚 PG 抖动余量不足 —— 与 receiptsList 同档放宽到 90s。
    { timeout: 90_000 },
    async () => {
      render(
        <CategoryDictList endpoint="/brands" title="牌号维护" dataFn="M04.F09.I01" />,
      );
      // B6 加载态：整页 PageLoading 门控后，标题随数据一起出现 → 并入 waitForTree
      await waitFor(() => {
        expect(screen.getByText("牌号维护")).toBeTruthy();
      });
      // 种子锚：选中「钢筋」后其下种子牌号行渲染（牌号全部挂在 P2，水泥下为空）。
      // 文本断言也进 waitFor：行提交与断言之间的响应乱序覆盖窗口（全量并发
      // 下偶发）由轮询吸收，锚本身不变。
      await selectRebarAndAwaitRows();
      await waitFor(() => {
        expect(screen.getAllByText(P2_BRAND_NAME).length).toBeGreaterThan(0);
      });
    },
  );

  fnTest(
    ["M04.F06.I02"],
    "型号维护：新建按钮开弹窗（检测项目/名称/备注表单）",
    { timeout: 45_000 },
    async () => {
      render(
        <CategoryDictList
          endpoint="/models"
          title="型号维护"
          createDataFn="M04.F06.I02"
        />,
      );
      await waitForTree();
      fireEvent.click(screen.getByRole("button", { name: "新建" }));
      await waitFor(() => {
        const h3 = document.querySelector("h3");
        expect(h3?.textContent).toBe("新建型号");
      });
      expect(screen.getByText("检测项目", { selector: "label" })).toBeTruthy();
    },
  );

  fnTest(
    ["M04.F06.I04"],
    "型号维护：行内删除按钮开确认弹窗",
    { timeout: 45_000 },
    async () => {
      render(
        <CategoryDictList
          endpoint="/models"
          title="型号维护"
          deleteDataFn="M04.F06.I04"
        />,
      );
      await selectRebarAndAwaitRows();
      await clickDeleteAndAwaitDialog();
    },
  );

  fnTest(["M04.F07.I02"], "规格维护：新建按钮开弹窗", { timeout: 45_000 }, async () => {
    render(
      <CategoryDictList
        endpoint="/specifications"
        title="规格维护"
        createDataFn="M04.F07.I02"
      />,
    );
    await waitForTree();
    fireEvent.click(screen.getByRole("button", { name: "新建" }));
    await waitFor(() => {
      const h3 = document.querySelector("h3");
      expect(h3?.textContent).toBe("新建规格");
    });
  });

  fnTest(
    ["M04.F07.I04"],
    "规格维护：行内删除按钮开确认弹窗",
    { timeout: 45_000 },
    async () => {
      render(
        <CategoryDictList
          endpoint="/specifications"
          title="规格维护"
          deleteDataFn="M04.F07.I04"
        />,
      );
      await selectRebarAndAwaitRows();
      await clickDeleteAndAwaitDialog();
    },
  );

  fnTest(["M04.F08.I02"], "等级维护：新建按钮开弹窗", { timeout: 45_000 }, async () => {
    render(
      <CategoryDictList endpoint="/grades" title="等级维护" createDataFn="M04.F08.I02" />,
    );
    await waitForTree();
    fireEvent.click(screen.getByRole("button", { name: "新建" }));
    await waitFor(() => {
      const h3 = document.querySelector("h3");
      expect(h3?.textContent).toBe("新建等级");
    });
  });

  fnTest(
    ["M04.F08.I04"],
    "等级维护：行内删除按钮开确认弹窗",
    { timeout: 45_000 },
    async () => {
      render(
        <CategoryDictList
          endpoint="/grades"
          title="等级维护"
          deleteDataFn="M04.F08.I04"
        />,
      );
      await selectRebarAndAwaitRows();
      await clickDeleteAndAwaitDialog();
    },
  );

  fnTest(["M04.F09.I02"], "牌号维护：新建按钮开弹窗", { timeout: 45_000 }, async () => {
    render(
      <CategoryDictList endpoint="/brands" title="牌号维护" createDataFn="M04.F09.I02" />,
    );
    await waitForTree();
    fireEvent.click(screen.getByRole("button", { name: "新建" }));
    await waitFor(() => {
      const h3 = document.querySelector("h3");
      expect(h3?.textContent).toBe("新建牌号");
    });
  });

  fnTest(
    ["M04.F09.I03"],
    "牌号维护：行内删除按钮开确认弹窗",
    { timeout: 45_000 },
    async () => {
      render(
        <CategoryDictList
          endpoint="/brands"
          title="牌号维护"
          deleteDataFn="M04.F09.I03"
        />,
      );
      await selectRebarAndAwaitRows();
      await clickDeleteAndAwaitDialog();
    },
  );
});

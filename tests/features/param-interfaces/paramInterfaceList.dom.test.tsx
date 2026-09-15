// M06.F08 参数界面维护 smoke —— 真链路（直连真 nextjs :5201，msw 已拆）。
//
// GET /api/param-interfaces（契约路径，Page<ParamInterface> 包）数据来自
// nextjs 进程内 fixtures（与 shared 种子同源 18 行）。本组用例只开弹窗
// 不落写，无隔离负担。
import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { fnTest } from "../../fn";
import { installRealChain } from "../../helpers/real-chain";
import { ParamInterfaceList } from "@/features/param-interfaces/ParamInterfaceList";

beforeEach(() => {
  installRealChain();
});

describe("M06.F08 参数界面维护", () => {
  fnTest(
    ["M06.F08.I01"],
    "参数界面：渲染标题 + 列表行（真后端种子数据穿透）",
    { timeout: 45_000 },
    async () => {
      render(<ParamInterfaceList />);
      expect(screen.getByText("参数界面维护")).toBeTruthy();
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
    },
  );

  fnTest(["M06.F08.I01"], "参数界面：新建按钮开弹窗", { timeout: 45_000 }, async () => {
    render(<ParamInterfaceList />);
    await waitFor(() => {
      expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
    });
    fireEvent.click(screen.getByRole("button", { name: "新建参数界面" }));
    await waitFor(() => {
      expect(screen.getByText("新建参数界面", { selector: "h2" })).toBeTruthy();
    });
  });

  fnTest(
    ["M06.F08.I01"],
    "参数界面：行内删除按钮开确认弹窗",
    { timeout: 45_000 },
    async () => {
      render(<ParamInterfaceList />);
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      const delBtns = await waitFor(() => {
        const btns = screen.getAllByRole("button", { name: "删除" });
        expect(btns.length).toBeGreaterThan(0);
        return btns;
      });
      fireEvent.click(delBtns[0]!);
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "删除参数界面" })).toBeTruthy();
      });
    },
  );
});

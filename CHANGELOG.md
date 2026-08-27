# CHANGELOG — lab-management-system-react

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [0.1.1] — 2026-08-27

- M01.F04.I01 前端失败语义改为上抛错误，不再静默回退静态 `MENU_TREE`：
  - `useBackendMenus` 拉取失败保留 error state，render 时抛 → ErrorBoundary 兜
  - `AppShellErrorBoundary` 渲染「菜单加载失败」错误态（数据 / msg / 提示）
  - AppShell 不再 `?? MENU_TREE`（与后端 503 miss demo 兜底删除对齐）
  - 测试：失败用例断言错误态（menus-error），不再断言回退静态树

## [0.1.0] — 2026-08-27

- 初始化台账：React 19 + Vite 前端镜像仓。历史变更见 git log 与 `.state/session.json`。

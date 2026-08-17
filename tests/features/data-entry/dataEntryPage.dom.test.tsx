import { describe, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { fnTest } from '../../fn'
import { server } from '../../setup.dom'
import { installShapeAdapters, resetFixtures } from '../../helpers/seed'
import { DataEntryPage } from '@/features/data-entry/DataEntryPage'
import { sampleReceipts } from '@lab/management-system-msw/fixtures'

/**
 * M03.F03 数据录入 smoke。
 *
 * 适配层 installShapeAdapters 已含：
 *   - /api/receipts?flowStatus=data_entry 过滤
 *   - /api/test-records POST/PUT（dictCrud 同款路由）
 *   - /api/samples /api/inspection-parameters 基础 GET
 *
 * 数据来自 fixtures 数组（同源非编造 mock）。
 */

beforeEach(async () => {
  cleanup()
  resetFixtures()
  installShapeAdapters(server)
  // 把第一条 task_assignment 行推进到 data_entry，保证列表有 1 行
  const r = sampleReceipts.find((x) => x.flowStatus === 'task_assignment') as
    | { id: string; flowStatus: string; flowHistory?: unknown[]; updatedAt?: string }
    | undefined
  if (r) {
    r.flowStatus = 'data_entry'
    r.flowHistory = [
      ...((r.flowHistory as unknown[] | undefined) ?? []),
      { action: 'submit', from: 'task_assignment', to: 'data_entry', operator: 'seed', at: new Date().toISOString() },
    ]
  }
})

describe('M03.F03 数据录入', () => {
  fnTest(['M03.F03.I01'], '数据录入：渲染标题 + 列表行（fixtures 真数据穿透）', async () => {
    render(
      <MemoryRouter>
        <DataEntryPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('数据录入')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
  })

  fnTest(['M03.F03.I03'], '数据录入：行内「录入结果」按钮（人工改判 verdict 入口）', async () => {
    render(
      <MemoryRouter>
        <DataEntryPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    const entryBtns = await waitFor(() => {
      const btns = screen.queryAllByRole('button', { name: '录入结果' })
      expect(btns.length).toBeGreaterThan(0)
      return btns
    })
    fireEvent.click(entryBtns[0]!)
    // 弹窗标题包含 commissionCode
    await waitFor(() => {
      const titles = screen.getAllByRole('heading', { name: /录入结果 —/ })
      expect(titles.length).toBeGreaterThan(0)
    })
  })

  fnTest(['M03.F03.I02'], '数据录入：弹窗内「保存检测记录」按钮可见（M03.F03.I02 data-fn 锚点）', async () => {
    render(
      <MemoryRouter>
        <DataEntryPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    const entryBtns = await waitFor(() => {
      const btns = screen.queryAllByRole('button', { name: '录入结果' })
      expect(btns.length).toBeGreaterThan(0)
      return btns
    })
    fireEvent.click(entryBtns[0]!)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '保存' })).toBeTruthy()
    })
  })
})
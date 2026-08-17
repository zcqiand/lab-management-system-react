import { describe, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { fnTest } from '../../fn'
import { server } from '../../setup.dom'
import { installShapeAdapters, resetFixtures } from '../../helpers/seed'
import { ReceiptDetail } from '@/features/receipts/ReceiptDetail'
import { sampleReceipts } from '@lab/management-system-msw/fixtures'

/**
 * M03.F09 接样单详情 smoke。
 *
 * 适配层已含 GET /api/receipts/:id（msw dictCrud 同款路由 + 单条返回）。
 * 数据来自 fixtures 数组。
 */

beforeEach(() => {
  cleanup()
  resetFixtures()
  installShapeAdapters(server)
})

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/receipts/${id}`]}>
      <Routes>
        <Route path="/receipts/:id" element={<ReceiptDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('M03.F09 接样单详情', () => {
  fnTest(['M03.F09.I01'], '接样单详情：渲染标题 + 字段区', async () => {
    const target = sampleReceipts[0]!
    renderDetail(target.id)
    await waitFor(() => {
      expect(screen.getByText(`接样单详情 — ${target.commissionCode}`)).toBeTruthy()
    })
  })

  fnTest(['M03.F09.I02'], '接样单详情：流程历史时间线卡片可见（空种子时显示占位）', async () => {
    const target = sampleReceipts[0]!
    renderDetail(target.id)
    await waitFor(() => {
      expect(screen.getByText('流程历史')).toBeTruthy()
    })
  })

  fnTest(['M03.F09.I03'], '接样单详情：报告预览按钮开弹窗', async () => {
    const target = sampleReceipts[0]!
    renderDetail(target.id)
    await waitFor(() => {
      expect(screen.getByText(`接样单详情 — ${target.commissionCode}`)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: '报告预览' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: `报告预览 — ${target.commissionCode}` })).toBeTruthy()
    })
  })
})
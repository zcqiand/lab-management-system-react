import { describe, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { fnTest } from '../../fn'
import { server } from '../../setup.dom'
import { installShapeAdapters, resetFixtures } from '../../helpers/seed'
import { sampleReceipts } from '@lab/management-system-msw/fixtures'
import ReportReviewPage from '@/pages/ReportReviewPage'
import ReportApprovePage from '@/pages/ReportApprovePage'
import ReportIssuePage from '@/pages/ReportIssuePage'
import ReportArchivePage from '@/pages/ReportArchivePage'

/**
 * M03.F05/F06/F07/F08 报告 4 阶段 smoke。
 *
 * 4 页共享 ReportPhasePage 组件，按 flowStatus 过滤同型。
 * 每个测试阶段前在 beforeEach 把一条对应阶段行推入，保证列表非空可渲染。
 * 适配层 installShapeAdapters 已含 /api/receipts?flowStatus=... 过滤 + /api/receipts/flow 流转。
 */

type Phase = 'review' | 'approval' | 'issuance' | 'archived'

function pushOneToPhase(phase: Phase): void {
  const r = sampleReceipts.find((x) => x.flowStatus === 'receiving') as
    | { id: string; flowStatus: string; flowHistory?: unknown[]; updatedAt?: string }
    | undefined
  if (!r) return
  r.flowStatus = phase
  // 沿途 push 各阶段流转历史（链式 submit）
  const path: Array<Phase | 'task_assignment' | 'data_entry'> = [
    'task_assignment',
    'data_entry',
    'review',
    'approval',
    'issuance',
    'archived',
  ]
  const stopIdx = path.indexOf(phase)
  r.flowHistory = path
    .slice(0, stopIdx + 1)
    .map((to, i) => ({
      action: 'submit',
      from: path[i - 1] ?? 'receiving',
      to,
      operator: 'seed',
      at: new Date(2026, 6, 1, 0, 0, i).toISOString(),
    }))
}

beforeEach(() => {
  cleanup()
  resetFixtures()
  installShapeAdapters(server)
})

describe('M03.F05 报告审核', () => {
  beforeEach(() => pushOneToPhase('review'))
  fnTest(['M03.F05.I01'], '报告审核：渲染标题 + 列表行（review 阶段 fixture 穿透）', async () => {
    render(
      <MemoryRouter>
        <ReportReviewPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('报告审核')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
  })

  fnTest(['M03.F05.I02'], '报告审核：「审核通过」按钮 data-fn 可见', async () => {
    render(
      <MemoryRouter>
        <ReportReviewPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    expect(screen.getByRole('button', { name: /审核通过/ })).toBeTruthy()
  })
})

describe('M03.F06 报告批准', () => {
  beforeEach(() => pushOneToPhase('approval'))
  fnTest(['M03.F06.I01'], '报告批准：渲染标题 + 列表行（approval 阶段 fixture 穿透）', async () => {
    render(
      <MemoryRouter>
        <ReportApprovePage />
      </MemoryRouter>,
    )
    expect(screen.getByText('报告批准')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
  })

  fnTest(['M03.F06.I02'], '报告批准：「批准」按钮 data-fn 可见', async () => {
    render(
      <MemoryRouter>
        <ReportApprovePage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    expect(screen.getByRole('button', { name: /批准/ })).toBeTruthy()
  })
})

describe('M03.F07 报告发放', () => {
  beforeEach(() => pushOneToPhase('issuance'))
  fnTest(['M03.F07.I01'], '报告发放：渲染标题 + 列表行（issuance 阶段 fixture 穿透）', async () => {
    render(
      <MemoryRouter>
        <ReportIssuePage />
      </MemoryRouter>,
    )
    expect(screen.getByText('报告发放')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
  })

  fnTest(['M03.F07.I02'], '报告发放：「发放」按钮 data-fn 可见', async () => {
    render(
      <MemoryRouter>
        <ReportIssuePage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    expect(screen.getByRole('button', { name: /发放/ })).toBeTruthy()
  })
})

describe('M03.F08 报告归档', () => {
  beforeEach(() => pushOneToPhase('archived'))
  fnTest(['M03.F08.I01'], '报告归档：渲染标题 + 列表行（archived 阶段 fixture 穿透）', async () => {
    render(
      <MemoryRouter>
        <ReportArchivePage />
      </MemoryRouter>,
    )
    expect(screen.getByText('报告归档')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
  })

  fnTest(['M03.F08.I02'], '报告归档：「归档完成」按钮 data-fn 可见', async () => {
    render(
      <MemoryRouter>
        <ReportArchivePage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    expect(screen.getByRole('button', { name: /归档完成/ })).toBeTruthy()
  })
})
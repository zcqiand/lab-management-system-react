import { describe, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { fnTest } from '../../fn'
import { server } from '../../setup.dom'
import { installShapeAdapters, resetFixtures } from '../../helpers/seed'
import { TaskAssignmentList } from '@/features/task-assignment/TaskAssignmentList'
import { sampleReceipts } from '@lab/management-system-msw/fixtures'

/**
 * M03.F02 任务分配 smoke。
 *
 * 适配层 installShapeAdapters 已含 /api/receipts?flowStatus=task_assignment 过滤。
 * 列表默认按该 filter 拉取（仅显示处于该阶段的接样单）；put /receipts/:id 更新
 * assigneeName/assigneeId/plannedTestDate。
 *
 * 注意：种子默认可能全部 receiving（没有 task_assignment 行）。测试准备阶段
 * 通过 POST /api/receipts/flow 推进一条 receiving → task_assignment，确保
 * 列表非空可渲染行。
 */

const TARGET_ID = 'forced-task-assignment-row'

beforeEach(async () => {
  cleanup()
  resetFixtures()
  installShapeAdapters(server)
  // 把第一条 receiving 行推进到 task_assignment，保证列表有 1 行
  const r = sampleReceipts.find((x) => x.flowStatus === 'receiving') as
    | { id: string; flowStatus: string; flowHistory?: unknown[]; updatedAt?: string }
    | undefined
  if (r) {
    r.flowStatus = 'task_assignment'
    r.flowHistory = [
      ...((r.flowHistory as unknown[] | undefined) ?? []),
      { action: 'submit', from: 'receiving', to: 'task_assignment', operator: 'seed', at: new Date().toISOString() },
    ]
    ;(r as { id: string }).id = TARGET_ID
  }
})

describe('M03.F02 任务分配', () => {
  fnTest(['M03.F02.I01'], '任务分配：渲染标题 + 列表行（fixtures 真数据穿透）', async () => {
    render(
      <MemoryRouter>
        <TaskAssignmentList />
      </MemoryRouter>,
    )
    expect(screen.getByText('任务分配')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
  })

  fnTest(['M03.F02.I02'], '任务分配：安排按钮开弹窗', async () => {
    render(
      <MemoryRouter>
        <TaskAssignmentList />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    const arrangeBtns = await waitFor(() => {
      const btns = screen.queryAllByRole('button', { name: '安排' })
      expect(btns.length).toBeGreaterThan(0)
      return btns
    })
    fireEvent.click(arrangeBtns[0]!)
    await waitFor(() => {
      // 弹窗标题包含 commissionCode，无法预知，用 contains 检测前缀
      expect(screen.getByRole('heading', { name: /任务安排 —/ })).toBeTruthy()
    })
  })
})
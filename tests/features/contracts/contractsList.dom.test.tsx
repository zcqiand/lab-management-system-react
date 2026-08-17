import { describe, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { fnTest } from '../../fn'
import { server } from '../../setup.dom'
import { http, HttpResponse } from 'msw'
import { installShapeAdapters, resetFixtures } from '../../helpers/seed'
import { ContractsList } from '@/features/contracts/ContractsList'
import { contracts } from '@lab/management-system-msw/fixtures'

/**
 * M02.F01 合同管理 smoke。
 *
 * lab-msw /contracts 返回裸数组；组件期望 REF 形状 {items}。适配层把裸数组
 * 包成 {items, total}，并补 keyword/status 过滤（msw handler 已带 keyword，
 * 这里只补 status 透传）。数据仍来自 fixtures 数组（无编造 mock）。
 */

function wrapContracts(rows: Array<Record<string, unknown>>) {
  return ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const keyword = url.searchParams.get('keyword') ?? ''
    let items = rows
    if (status) items = items.filter((r) => r['status'] === status)
    if (keyword)
      items = items.filter(
        (r) =>
          String(r['contractCode'] ?? '').includes(keyword) ||
          String(r['projectName'] ?? '').includes(keyword),
      )
    return HttpResponse.json({
      items,
      page: 1,
      pageSize: items.length || 1,
      total: items.length,
    })
  }
}

beforeEach(() => {
  cleanup()
  resetFixtures()
  installShapeAdapters(server)
  server.use(
    http.get('*/api/contracts', wrapContracts(contracts as unknown as Array<Record<string, unknown>>)),
  )
})

describe('M02.F01 合同管理', () => {
  fnTest(['M02.F01.I01'], '合同列表：渲染标题 + 列表行（fixtures 真数据穿透）', async () => {
    render(<ContractsList />)
    expect(screen.getByText('合同管理')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
  })

  fnTest(['M02.F01.I02'], '合同管理：新建按钮开弹窗', async () => {
    render(<ContractsList />)
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    fireEvent.click(screen.getByRole('button', { name: '新建合同' }))
    await waitFor(() => {
      expect(screen.getByText('新建合同', { selector: 'h2' })).toBeTruthy()
    })
  })

  fnTest(['M02.F01.I03'], '合同管理：行内删除按钮开确认弹窗', async () => {
    render(<ContractsList />)
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    const delBtns = await waitFor(() => {
      const btns = screen.getAllByRole('button', { name: '删除' })
      expect(btns.length).toBeGreaterThan(0)
      return btns
    })
    fireEvent.click(delBtns[0]!)
    await waitFor(() => {
      // 弹窗标题（h3）渲染即视为开
      expect(screen.getByRole('heading', { name: '删除合同' })).toBeTruthy()
    })
  })
})
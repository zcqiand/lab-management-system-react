import { describe, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { fnTest } from '../../fn'
import { server } from '../../setup.dom'
import { installShapeAdapters, resetFixtures } from '../../helpers/seed'
import { ReportNameList } from '@/features/report-names/ReportNameList'

/**
 * M06.F07 报告名称维护 smoke。
 *
 * 适配层已包含在 installShapeAdapters（http.get /api/report-names 注册），
 * 直接复用即可。
 */

beforeEach(() => {
  cleanup()
  resetFixtures()
  installShapeAdapters(server)
})

describe('M06.F07 报告名称维护', () => {
  fnTest(['M06.F07.I01'], '报告名称：渲染标题 + 列表行（fixtures 真数据穿透）', async () => {
    render(<ReportNameList />)
    expect(screen.getByText('报告名称维护')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
  })

  fnTest(['M06.F07.I01'], '报告名称：新建按钮开弹窗（带 extFields 文本域）', async () => {
    render(<ReportNameList />)
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    fireEvent.click(screen.getByRole('button', { name: '新建报告名称' }))
    await waitFor(() => {
      expect(screen.getByText('新建报告名称', { selector: 'h2' })).toBeTruthy()
      expect(screen.getByText('扩展属性 extFields（JSON 数组）')).toBeTruthy()
    })
  })

  fnTest(['M06.F07.I01'], '报告名称：行内删除按钮开确认弹窗', async () => {
    render(<ReportNameList />)
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
      expect(screen.getByRole('heading', { name: '删除报告名称' })).toBeTruthy()
    })
  })
})
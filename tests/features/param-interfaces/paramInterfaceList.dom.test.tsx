import { describe, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { fnTest } from '../../fn'
import { server } from '../../setup.dom'
import { installShapeAdapters, resetFixtures } from '../../helpers/seed'
import { ParamInterfaceList } from '@/features/param-interfaces/ParamInterfaceList'

/**
 * M06.F08 参数界面维护 smoke。
 *
 * 适配层已包含在 installShapeAdapters（http.get /api/inspection-param-interfaces 注册），
 * 直接复用即可。
 */

beforeEach(() => {
  cleanup()
  resetFixtures()
  installShapeAdapters(server)
})

describe('M06.F08 参数界面维护', () => {
  fnTest(['M06.F08.I01'], '参数界面：渲染标题 + 列表行（fixtures 真数据穿透）', async () => {
    render(<ParamInterfaceList />)
    expect(screen.getByText('参数界面维护')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
  })

  fnTest(['M06.F08.I01'], '参数界面：新建按钮开弹窗', async () => {
    render(<ParamInterfaceList />)
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })
    fireEvent.click(screen.getByRole('button', { name: '新建参数界面' }))
    await waitFor(() => {
      expect(screen.getByText('新建参数界面', { selector: 'h2' })).toBeTruthy()
    })
  })

  fnTest(['M06.F08.I01'], '参数界面：行内删除按钮开确认弹窗', async () => {
    render(<ParamInterfaceList />)
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
      expect(screen.getByRole('heading', { name: '删除参数界面' })).toBeTruthy()
    })
  })
})
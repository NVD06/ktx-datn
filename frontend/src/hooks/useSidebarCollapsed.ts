import { useState } from 'react'
const STORAGE_KEY = 'sidebar-collapsed'
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')
  function toggle() {
    localStorage.setItem(STORAGE_KEY, collapsed ? '0' : '1')
    setCollapsed(!collapsed)
  }
  return [collapsed, toggle] as const
}

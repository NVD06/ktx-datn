import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Health = { status: string; time: string }

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Gọi qua đường dẫn tương đối để đi bằng Vite proxy — xem convention.md §4.3.
  async function checkHealth() {
    setError(null)
    try {
      const res = await fetch('/api/v1/health')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setHealth(json.data)
    } catch (e) {
      setHealth(null)
      setError(e instanceof Error ? e.message : 'Không gọi được API')
    }
  }

  useEffect(() => {
    void checkHealth()
  }, [])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Quản lý ký túc xá</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Khung dự án — kiểm tra kết nối frontend và backend
        </p>
      </div>

      <div className="w-full max-w-md rounded-lg border p-4 text-sm">
        {health ? (
          <div className="space-y-1">
            <p className="font-medium text-emerald-600">Backend đã kết nối</p>
            <p className="text-muted-foreground">
              Trạng thái: {health.status} · {new Date(health.time).toLocaleString('vi-VN')}
            </p>
          </div>
        ) : error ? (
          <div className="space-y-1">
            <p className="text-destructive font-medium">Chưa gọi được backend</p>
            <p className="text-muted-foreground">{error} — chạy `npm run dev` trong backend/</p>
          </div>
        ) : (
          <p className="text-muted-foreground">Đang kiểm tra...</p>
        )}
      </div>

      <Button onClick={() => void checkHealth()}>Kiểm tra lại</Button>
    </main>
  )
}

export default App

import { useEffect, useRef, useState } from 'react'
import type { Telemetry } from '../api/types'
import { fleetApi } from '../api/fleet'

export type StreamMode = 'connecting' | 'websocket' | 'polling'

/**
 * Поток телеметрии (ТЗ 4.7): основной канал — WebSocket /ws/telemetry,
 * при потере соединения — автоматический переход на опрос /api/telemetry
 * раз в 3 секунды (ТЗ 9.2) с последующим восстановлением WebSocket.
 */
export function useTelemetryStream(enabled: boolean) {
  const [telemetry, setTelemetry] = useState<Map<number, Telemetry>>(new Map())
  const [mode, setMode] = useState<StreamMode>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closed = useRef(false)

  useEffect(() => {
    if (!enabled) return
    closed.current = false

    const applyBatch = (items: Telemetry[]) => {
      setTelemetry((prev) => {
        const next = new Map(prev)
        for (const item of items) next.set(item.vehicleId, item)
        return next
      })
    }

    const startPolling = () => {
      if (pollRef.current || closed.current) return
      setMode('polling')
      const poll = async () => {
        try {
          applyBatch(await fleetApi.telemetry())
        } catch {
          /* сеть недоступна — повторим на следующем интервале */
        }
      }
      void poll()
      pollRef.current = setInterval(poll, 3000)
    }

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    const connect = () => {
      if (closed.current) return
      setMode('connecting')
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${window.location.host}/ws/telemetry`)
      wsRef.current = ws
      ws.onopen = () => {
        stopPolling()
        setMode('websocket')
      }
      ws.onmessage = (event) => {
        try {
          applyBatch(JSON.parse(event.data) as Telemetry[])
        } catch {
          /* некорректный кадр — пропускаем */
        }
      }
      ws.onclose = () => {
        if (!closed.current) {
          startPolling()
          reconnectTimer.current = setTimeout(connect, 5000)
        }
      }
      ws.onerror = () => ws.close()
    }

    // первичная загрузка состояния, затем WebSocket
    fleetApi.telemetry().then(applyBatch).catch(() => undefined)
    connect()

    return () => {
      closed.current = true
      stopPolling()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [enabled])

  return { telemetry, mode }
}

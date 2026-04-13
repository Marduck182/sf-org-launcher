import { useEffect, useState, useCallback } from 'react'
import { CommandPalette } from './components/CommandPalette'
import type { SfOrg } from '../../shared/types'

type LoadState = 'loading' | 'ready' | 'error'

export default function App() {
  const [orgs,         setOrgs]         = useState<SfOrg[]>([])
  const [loadState,    setLoadState]    = useState<LoadState>('loading')
  const [error,        setError]        = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchOrgs = useCallback(async (force = false) => {
    if (force) {
      setIsRefreshing(true)
    } else {
      setLoadState('loading')
    }

    try {
      const res = force
        ? await window.electronAPI.refreshOrgs()
        : await window.electronAPI.listOrgs()

      if (res.success) {
        setOrgs(res.data)
        setLoadState('ready')
        setError('')
      } else {
        setError(res.error)
        setLoadState('error')
      }
    } catch (e: unknown) {
      setError(String(e))
      setLoadState('error')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchOrgs()

    // Tray context menu triggered a refresh
    const cleanForce    = window.electronAPI.onForceRefresh(() => fetchOrgs(true))
    // Main process pushed fresh data after a background refresh
    const cleanRefreshed = window.electronAPI.onOrgsRefreshed(fresh => {
      setOrgs(fresh)
      setLoadState('ready')
      setIsRefreshing(false)
    })

    return () => {
      cleanForce()
      cleanRefreshed()
    }
  }, [fetchOrgs])

  return (
    <CommandPalette
      orgs={orgs}
      loadState={loadState}
      error={error}
      isRefreshing={isRefreshing}
      onRefresh={() => fetchOrgs(true)}
    />
  )
}

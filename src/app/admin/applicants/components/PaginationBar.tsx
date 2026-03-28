// src/app/admin/applicants/components/PaginationBar.tsx
import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  setCurrentPage: (p: number) => void
  isDarkMode: boolean
  totalShowing?: number
  totalCount?: number
  compact?: boolean
  showTotalText?: boolean
}

export function PaginationBar({
  currentPage, 
  totalPages, 
  setCurrentPage, 
  isDarkMode,
  totalShowing, 
  totalCount, 
  compact = false,
  showTotalText = true,
}: PaginationBarProps) {
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  // 5-page sliding window centered on currentPage
  const getPages = (): number[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    let start = Math.max(1, currentPage - 2)
    let end = start + 4
    if (end > totalPages) { end = totalPages; start = Math.max(1, end - 4) }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const pages = getPages()
  const showFirstPage = pages[0] > 1
  const showLastPage = pages[pages.length - 1] < totalPages
  const showStartDots = pages[0] > 2
  const showEndDots = pages[pages.length - 1] < totalPages - 1

  const c = isDarkMode
    ? { border: 'rgba(51,65,85,0.7)', text: '#94a3b8', hover: 'rgba(51,65,85,0.45)', activeBg: 'rgba(59,130,246,0.18)', activeBorder: '#3b82f6', activeText: '#93c5fd', dots: '#475569' }
    : { border: '#e2e8f0', text: '#64748b', hover: '#f1f5f9', activeBg: '#eff6ff', activeBorder: '#2563eb', activeText: '#2563eb', dots: '#94a3b8' }

  const base: React.CSSProperties = {
    height: 36, minWidth: 36, borderRadius: 10,
    border: `1.5px solid ${c.border}`, background: 'transparent',
    color: c.text, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, transition: 'all 0.14s ease',
    padding: '0 10px', userSelect: 'none' as const,
  }
  const active: React.CSSProperties = {
    ...base, background: c.activeBg, border: `1.5px solid ${c.activeBorder}`,
    color: c.activeText, fontWeight: 900,
  }
  const nav = (enabled: boolean): React.CSSProperties => ({
    ...base,
    gap: 5, padding: '0 13px',
    fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
    ...(enabled ? {} : { opacity: 0.32, cursor: 'not-allowed' as const }),
  })
  const dot: React.CSSProperties = {
    height: 36, minWidth: 24,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, color: c.dots, fontWeight: 700, userSelect: 'none' as const,
    letterSpacing: 1,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: compact ? 'center' : 'space-between', gap: 8, width: '100%' }}>
      {!compact && showTotalText && totalShowing !== undefined && (
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.text }}>
          Showing {totalShowing} of {totalCount}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>

        {/* ← Prev */}
        <button
          style={nav(canPrev)}
          disabled={!canPrev}
          onClick={() => canPrev && setCurrentPage(currentPage - 1)}
          onMouseEnter={e => { if (canPrev) (e.currentTarget as HTMLElement).style.background = c.hover }}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <ChevronLeft size={13} strokeWidth={2.5} />
          {!compact && <span>Prev</span>}
        </button>

        {/* First page anchor */}
        {showFirstPage && (
          <>
            <button style={base} onClick={() => setCurrentPage(1)}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = c.hover}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              1
            </button>
            {showStartDots && <span style={dot}>···</span>}
          </>
        )}

        {/* 5-page window */}
        {pages.map(p => (
          <button
            key={p}
            style={p === currentPage ? active : base}
            onClick={() => setCurrentPage(p)}
            onMouseEnter={e => { if (p !== currentPage) (e.currentTarget as HTMLElement).style.background = c.hover }}
            onMouseLeave={e => { if (p !== currentPage) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {p}
          </button>
        ))}

        {/* Last page anchor */}
        {showLastPage && (
          <>
            {showEndDots && <span style={dot}>···</span>}
            <button style={base} onClick={() => setCurrentPage(totalPages)}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = c.hover}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              {totalPages}
            </button>
          </>
        )}

        {/* Next → */}
        <button
          style={nav(canNext)}
          disabled={!canNext}
          onClick={() => canNext && setCurrentPage(currentPage + 1)}
          onMouseEnter={e => { if (canNext) (e.currentTarget as HTMLElement).style.background = c.hover }}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {!compact && <span>Next</span>}
          <ChevronRight size={13} strokeWidth={2.5} />
        </button>

      </div>
    </div>
  )
}

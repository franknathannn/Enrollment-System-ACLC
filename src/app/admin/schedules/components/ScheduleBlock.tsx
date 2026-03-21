"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  ScheduleRow, subjectPalette, toMins, toDisp,
  SLOT_MINS, SLOT_H,
} from "./types"

interface Props {
  row: ScheduleRow
  timeStart: number
  timeEnd: number
  isDarkMode: boolean
  onDragStart: (e: React.MouseEvent, row: ScheduleRow, colEl: HTMLElement) => void
  onEdit: (row: ScheduleRow) => void
}

// ── Floating hover preview card ───────────────────────────────────────────────
// Rendered via portal into document.body so it is NEVER clipped by any parent.
// Smart positioning: appears to the right of the block, flips left if near edge.
function HoverCard({
  row, isDarkMode, anchorRect,
}: {
  row: ScheduleRow
  isDarkMode: boolean
  anchorRect: DOMRect
}) {
  const pal    = subjectPalette(row.subject)
  const colors = isDarkMode ? pal.dark : pal.light
  const cardW  = 214
  const cardH  = 130
  const gap    = 14

  // Horizontal: prefer right, flip left if not enough room
  const spaceRight = window.innerWidth - anchorRect.right - gap
  let left = anchorRect.right + gap
  if (spaceRight < cardW) left = anchorRect.left - cardW - gap

  // Vertical: centre on block, clamp inside viewport
  let top = anchorRect.top + anchorRect.height / 2 - cardH / 2
  top = Math.max(8, Math.min(top, window.innerHeight - cardH - 8))

  const bg        = isDarkMode ? "rgba(15,23,42,0.98)"        : "rgba(255,255,255,0.99)"
  const bdrColor  = isDarkMode ? "rgba(51,65,85,0.9)"         : "rgba(226,232,240,1)"
  const shadow    = isDarkMode
    ? "0 20px 40px -8px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06)"
    : "0 20px 40px -8px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)"
  const labelClr  = isDarkMode ? "rgba(100,116,139,0.85)"     : "rgba(100,116,139,0.85)"
  const valueClr  = isDarkMode ? "#f1f5f9"                    : "#0f172a"
  const hintClr   = isDarkMode ? "rgba(71,85,105,0.7)"        : "rgba(148,163,184,0.9)"
  const divClr    = isDarkMode ? "rgba(51,65,85,0.6)"         : "rgba(226,232,240,0.8)"

  const dur = toMins(row.end_time) - toMins(row.start_time)
  const details = [
    { label: "Time",     val: `${toDisp(toMins(row.start_time))} – ${toDisp(toMins(row.end_time))}` },
    { label: "Duration", val: `${dur} min` },
    row.teacher ? { label: "Teacher", val: row.teacher } : null,
    row.room    ? { label: "Room",    val: row.room    } : null,
    { label: "Section",  val: row.section },
  ].filter(Boolean) as { label: string; val: string }[]

  return (
    <div style={{
      position: "fixed",
      top, left,
      width: cardW,
      zIndex: 99999,
      background: bg,
      border: `1px solid ${bdrColor}`,
      borderRadius: 20,
      boxShadow: shadow,
      padding: "14px 16px 12px",
      pointerEvents: "none",
      animation: "schedHcIn 0.14s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <style>{`
        @keyframes schedHcIn {
          from { opacity:0; transform:scale(0.92) translateY(6px) }
          to   { opacity:1; transform:scale(1)    translateY(0)   }
        }
      `}</style>

      {/* Top accent bar matching subject colour */}
      <div style={{
        position: "absolute", top: 0, left: 14, right: 14, height: 3,
        borderRadius: "0 0 6px 6px", background: pal.dot, opacity: 0.9,
      }} />

      {/* Subject header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 10 }}>
        <div style={{
          width: 9, height: 9, borderRadius: "50%",
          background: pal.dot, flexShrink: 0,
        }} />
        <p style={{
          margin: 0, fontSize: 11.5, fontWeight: 900,
          textTransform: "uppercase", letterSpacing: "0.05em",
          color: colors.text, lineHeight: 1.2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {row.subject}
        </p>
      </div>

      {/* Detail rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {details.map(item => (
          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{
              fontSize: 8, fontWeight: 800, textTransform: "uppercase",
              letterSpacing: "0.1em", color: labelClr, flexShrink: 0,
            }}>
              {item.label}
            </span>
            <span style={{
              fontSize: 9.5, fontWeight: 700, color: valueClr,
              textAlign: "right", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130,
            }}>
              {item.val}
            </span>
          </div>
        ))}
      </div>

      {/* Hint footer */}
      <div style={{
        marginTop: 10, paddingTop: 8,
        borderTop: `1px solid ${divClr}`,
        fontSize: 7.5, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        color: hintClr, textAlign: "center",
      }}>
        drag · double-click to edit
      </div>
    </div>
  )
}

// ── Schedule block ────────────────────────────────────────────────────────────
export function ScheduleBlock({ row, timeStart, timeEnd, isDarkMode, onDragStart, onEdit }: Props) {
  const st    = Math.max(toMins(row.start_time), timeStart)
  const en    = Math.min(toMins(row.end_time),   timeEnd)
  const INSET = 3
  const topPx = ((st - timeStart) / SLOT_MINS) * SLOT_H + INSET
  const hPx   = Math.max(((en - st) / SLOT_MINS) * SLOT_H - INSET * 2, 22)

  const pal    = subjectPalette(row.subject)
  const colors = isDarkMode ? pal.dark : pal.light

  const [hovered,    setHovered]    = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const blockRef  = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEnter = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
    if (blockRef.current) setAnchorRect(blockRef.current.getBoundingClientRect())
    setHovered(true)
  }, [])

  const handleLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setHovered(false), 80)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  return (
    <>
      <div
        ref={blockRef}
        style={{
          position: "absolute",
          top: topPx,
          height: hPx,
          left: 4,
          right: 4,
          // Hard cap at 18 — sticky section headers are zIndex 20, strand header 30.
          // This block can NEVER visually overlap the headers.
          zIndex: 10,
          overflow: "hidden",
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
          background: colors.bg,
          color: colors.text,
          cursor: "grab",
          userSelect: "none",
          transition: "box-shadow 0.15s ease, transform 0.15s ease",
          boxShadow: hovered
            ? isDarkMode
              ? "0 6px 18px -4px rgba(0,0,0,0.55)"
              : "0 6px 18px -4px rgba(0,0,0,0.13)"
            : "none",
          transform: hovered ? "scale(1.015)" : "scale(1)",
          boxSizing: "border-box",
        }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onMouseDown={e => {
          setHovered(false)
          ;(e.currentTarget as HTMLElement).style.cursor = "grabbing"
          const colEl = (e.currentTarget as HTMLElement).closest("[data-col]") as HTMLElement
          if (colEl) onDragStart(e, row, colEl)
        }}
        onMouseUp={e => { ;(e.currentTarget as HTMLElement).style.cursor = "grab" }}
        onDoubleClick={e => { e.stopPropagation(); onEdit(row) }}
      >
        <div style={{
          height: "100%", display: "flex", flexDirection: "column",
          padding: "8px 12px 8px 18px", gap: 2, overflow: "hidden",
        }}>
          {/* Left accent bar */}
          <div style={{
            position: "absolute", top: 6, bottom: 6, left: 5,
            width: 3, borderRadius: 99, background: pal.dot, opacity: 0.75,
          }} />

          {/* Subject */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
            <div style={{ marginTop: 3, width: 7, height: 7, borderRadius: "50%", background: pal.dot, flexShrink: 0 }} />
            <p style={{
              fontSize: 10, fontWeight: 900, textTransform: "uppercase",
              lineHeight: 1.3, margin: 0, overflow: "hidden",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              {row.subject}
            </p>
          </div>

          {hPx >= 44 && (
            <p style={{ fontSize: 8.5, fontWeight: 600, margin: 0, paddingLeft: 13, opacity: 0.65, whiteSpace: "nowrap" }}>
              {toDisp(toMins(row.start_time))} – {toDisp(toMins(row.end_time))}
            </p>
          )}
          {hPx >= 60 && row.teacher && (
            <p style={{ fontSize: 8, margin: 0, paddingLeft: 13, opacity: 0.60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.teacher}
            </p>
          )}
          {hPx >= 76 && row.room && (
            <p style={{ fontSize: 8, margin: 0, paddingLeft: 13, opacity: 0.50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.room}
            </p>
          )}
        </div>
      </div>

      {/* Hover card — portal into body, completely outside the clipped column */}
      {hovered && anchorRect && createPortal(
        <HoverCard row={row} isDarkMode={isDarkMode} anchorRect={anchorRect} />,
        document.body
      )}
    </>
  )
}
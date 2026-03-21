"use client"

import { useState, useEffect, useRef } from "react"
import {
  ScheduleRow, SLOT_MINS, SLOT_H, TIME_W,
  toMins, toDisp, StrandFilter,
} from "./types"
import { ScheduleBlock } from "./ScheduleBlock"

interface Props {
  strandFilter: StrandFilter
  ictSections: string[]
  gasSections: string[]
  dayRows: ScheduleRow[]
  timeStart: number
  timeEnd: number
  isDarkMode: boolean
  surf: string
  bdr: string
  muted: string
  txt: string
  ghostRef: React.MutableRefObject<HTMLDivElement | null>
  onBlockDragStart: (e: React.MouseEvent, row: ScheduleRow, colEl: HTMLElement) => void
  onEdit: (row: ScheduleRow) => void
}

export function StrandGrid({
  strandFilter, ictSections, gasSections, dayRows,
  timeStart, timeEnd, isDarkMode, surf, bdr, muted, txt,
  ghostRef, onBlockDragStart, onEdit,
}: Props) {

  const showICT = strandFilter !== "GAS"
  const showGAS = strandFilter !== "ICT"
  const isBoth  = strandFilter === "BOTH"

  // Dynamic column width: fills viewport width, updates on resize.
  const totalCols = (showICT ? ictSections.length : 0) + (showGAS ? gasSections.length : 0)
  const calcColW = () => totalCols === 0 ? 200 : Math.max(
    160,
    Math.min(260, Math.floor(((typeof window !== "undefined" ? window.innerWidth : 800) - TIME_W - 32) / totalCols))
  )
  const [COL_W, setColW] = useState(calcColW)
  useEffect(() => {
    const onResize = () => setColW(calcColW())
    window.addEventListener("resize", onResize)
    setColW(calcColW())
    return () => window.removeEventListener("resize", onResize)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCols])

  // Fade-in on change
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [strandFilter, timeStart, timeEnd])

  const scrollId = useRef(`sg${Math.random().toString(36).slice(2,7)}`).current

  // Ordered flat column list: ICT first, then GAS
  const cols: Array<{ name: string; strand: "ICT" | "GAS" }> = [
    ...(showICT ? ictSections.map(n => ({ name: n, strand: "ICT" as const })) : []),
    ...(showGAS ? gasSections.map(n => ({ name: n, strand: "GAS" as const })) : []),
  ]

  // ── Colors ────────────────────────────────────────────────────────────────
  const ictColor  = "#2563eb"
  const gasColor  = "#d97706"
  const ictBg     = isDarkMode ? "rgba(37,99,235,0.10)"   : "rgba(37,99,235,0.04)"
  const gasBg     = isDarkMode ? "rgba(217,119,6,0.10)"   : "rgba(217,119,6,0.04)"
  // Divider: always a strong visible line between ICT and GAS
  const divBdr    = isDarkMode ? "rgba(148,163,184,0.50)" : "rgba(100,116,139,0.35)"
  const hourBg    = isDarkMode ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.013)"
  const slotLine  = isDarkMode ? "rgba(255,255,255,0.05)"  : "rgba(0,0,0,0.05)"
  const hourLine  = isDarkMode ? "rgba(255,255,255,0.09)"  : "rgba(0,0,0,0.09)"
  const timeMajor = isDarkMode ? "rgba(148,163,184,0.95)" : "rgba(51,65,85,0.88)"
  const timeMinor = isDarkMode ? "rgba(100,116,139,0.50)" : "rgba(148,163,184,0.65)"
  const hdrBg     = surf

  // ── Time labels: one per slot, inclusive of end (for last border) ─────────
  const timeLabels: number[] = []
  for (let m = timeStart; m <= timeEnd; m += SLOT_MINS) timeLabels.push(m)
  const gridH   = (timeLabels.length - 1) * SLOT_H
  const contentW = TIME_W + cols.length * COL_W

  // Divider: after last ICT column, BOTH mode only
  const divAfterIdx = (isBoth && showICT && showGAS) ? ictSections.length - 1 : -1

  const ictPeriods = dayRows.filter(r => ictSections.includes(r.section)).length
  const gasPeriods = dayRows.filter(r => gasSections.includes(r.section)).length

  // ── Shared cell style helpers ─────────────────────────────────────────────
  const timeCellH = 36  // height of "TIME" header cell + section name header cell

  return (
    <>
      {/* Hide ALL scrollbars everywhere on this page — still scrollable */}
      <style>{`
        #${scrollId},
        #${scrollId} * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        #${scrollId}::-webkit-scrollbar,
        #${scrollId} *::-webkit-scrollbar { display: none }
      `}</style>

      {/* ── OUTER BOX ────────────────────────────────────────────────────── */}
      <div
        className="rounded-3xl border overflow-hidden"
        style={{
          background: surf,
          borderColor: bdr,
          width: "fit-content",
          minWidth: "100%",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.20s ease, transform 0.20s ease",
        }}
      >
        {/* Scrollable — horizontal always, vertical for mobile (touch-friendly) */}
        <div
          id={scrollId}
          style={{
            overflowX: "auto",
            overflowY: "visible",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x pan-y",
          }}
        >
          {/* Inner fixed-width content — wider than viewport → scrolls */}
          <div style={{ width: contentW }}>

            {/*
              ── STICKY STRAND HEADER: "TIME" + ICT/GAS bands ──────────────
              position:sticky top:0 zIndex:30 — pinned to top during vertical
              scroll, scrolls left/right with the grid. The ICT/GAS divider
              borderRight is maintained here at the same weight as column dividers.
            */}
            <div style={{
              display: "flex",
              position: "sticky",
              top: 0,
              zIndex: 30,
              background: hdrBg,
              borderBottom: `1px solid ${bdr}`,
              width: contentW,
            }}>
              {/* "TIME" label cell */}
              <div style={{
                width: TIME_W,
                minWidth: TIME_W,
                flexShrink: 0,
                borderRight: `1px solid ${bdr}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 40,
                background: hdrBg,
                position: "sticky",
                left: 0,
                zIndex: 31,
              }}>
                <span style={{
                  fontSize: "8px",
                  fontWeight: 900,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: isDarkMode ? "rgba(100,116,139,0.6)" : "rgba(148,163,184,0.8)",
                }}>
                  TIME
                </span>
              </div>

              {/* ICT strand band */}
              {showICT && ictSections.length > 0 && (
                <div style={{
                  width: ictSections.length * COL_W,
                  minWidth: ictSections.length * COL_W,
                  flexShrink: 0,
                  overflow: "hidden",
                  background: ictBg,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 20px",
                  height: 40,
                  borderRight: (isBoth && showGAS)
                    ? `2px solid ${divBdr}`
                    : `1px solid ${bdr}`,
                }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:ictColor, flexShrink:0 }} />
                  <span style={{
                    fontSize:"9px", fontWeight:900, letterSpacing:"0.3em",
                    textTransform:"uppercase", color:ictColor,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  }}>
                    ICT Strand — {ictSections.length} section{ictSections.length!==1?"s":""}
                  </span>
                  <span style={{ marginLeft:"auto", flexShrink:0, fontSize:"8px", fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:muted }}>
                    {ictPeriods} period{ictPeriods!==1?"s":""}
                  </span>
                </div>
              )}

              {/* GAS strand band */}
              {showGAS && gasSections.length > 0 && (
                <div style={{
                  width: gasSections.length * COL_W,
                  minWidth: gasSections.length * COL_W,
                  flexShrink: 0,
                  overflow: "hidden",
                  background: gasBg,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 20px",
                  height: 40,
                }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:gasColor, flexShrink:0 }} />
                  <span style={{
                    fontSize:"9px", fontWeight:900, letterSpacing:"0.3em",
                    textTransform:"uppercase", color:gasColor,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  }}>
                    GAS Strand — {gasSections.length} section{gasSections.length!==1?"s":""}
                  </span>
                  <span style={{ marginLeft:"auto", flexShrink:0, fontSize:"8px", fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:muted }}>
                    {gasPeriods} period{gasPeriods!==1?"s":""}
                  </span>
                </div>
              )}
            </div>

            {/*
              ── STICKY SECTION COLUMN HEADERS ─────────────────────────────
              position:sticky top:40 (directly below the 40px strand header).
              zIndex:20 (below strand header at 30 so it slides under it cleanly).
              The divider border on the last ICT column matches the strand bands.
            */}
            <div style={{
              display: "flex",
              position: "sticky",
              top: 40,
              zIndex: 20,
              background: hdrBg,
              borderBottom: `1px solid ${bdr}`,
              width: contentW,
            }}>
              {/* TIME gutter — blank, matches time axis width, sticky left */}
              <div style={{
                width: TIME_W, minWidth: TIME_W, flexShrink: 0,
                borderRight: `1px solid ${bdr}`,
                position: "sticky",
                left: 0,
                zIndex: 21,
                background: hdrBg,
              }} />

              {/* One header cell per column */}
              {cols.map((col, idx) => {
                const count = dayRows.filter(r => r.section === col.name).length
                const color = col.strand === "ICT" ? ictColor : gasColor
                const isDiv = idx === divAfterIdx

                return (
                  <div key={col.name} style={{
                    width: COL_W, minWidth: COL_W, flexShrink: 0,
                    padding: "12px 8px",
                    textAlign: "center",
                    // Divider after last ICT column — same weight as strand header
                    borderRight: isDiv ? `2px solid ${divBdr}` : `1px solid ${bdr}`,
                    overflow: "hidden",
                  }}>
                    <p style={{
                      fontSize:"11px", fontWeight:900,
                      textTransform:"uppercase", letterSpacing:"0.05em",
                      color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                    }}>
                      {col.name}
                    </p>
                    <p style={{ fontSize:"7.5px", fontWeight:600, color:muted, marginTop:2 }}>
                      {count} period{count!==1?"s":""}
                    </p>
                  </div>
                )
              })}
            </div>

            {/*
              ── GRID BODY ──────────────────────────────────────────────────
              Time axis is sticky left:0.
              Each section column contains ONLY its own schedule blocks.

              TIME LABEL ALIGNMENT:
              Labels are placed at `top: i * SLOT_H`.
              The label for timeStart (e.g. 6:00 AM) is at top:0.
              Row stripe for slot i is also at top: i * SLOT_H.
              So the "6:00 AM" label lines up EXACTLY with the top of the
              first row stripe — they share the same y position.
            */}
            <div style={{ display:"flex", width:contentW, height:gridH }}>

              {/* TIME AXIS — sticky left, z-index above schedule blocks */}
              <div style={{
                width: TIME_W, minWidth: TIME_W, flexShrink: 0,
                height: gridH,
                position: "sticky", left: 0, zIndex: 15,
                background: surf,
                borderRight: `1px solid ${bdr}`,
                overflow: "hidden",
              }}>
                {timeLabels.map((m, i) => {
                  const isHour = m % 60 === 0
                  return (
                    <div key={m} style={{
                      position: "absolute",
                      // Label top = exactly the same y as the row stripe top
                      top: i * SLOT_H,
                      left: 0, right: 0,
                      height: SLOT_H,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "flex-end",
                      paddingRight: 12,
                      // Nudge text down by 4px so it sits just below the line
                      paddingTop: 4,
                      zIndex: 5,
                      pointerEvents: "none",
                    }}>
                      <span style={{
                        fontSize: isHour ? "9.5px" : "7.5px",
                        fontWeight: isHour ? 900 : 500,
                        color: isHour ? timeMajor : timeMinor,
                        whiteSpace: "nowrap",
                        letterSpacing: isHour ? "0.02em" : "0",
                        lineHeight: 1,
                        userSelect: "none",
                      }}>
                        {toDisp(m)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* SECTION COLUMNS — each isolated to its own section's rows */}
              {cols.map((col, idx) => {
                const colRows     = dayRows.filter(r => r.section === col.name)
                const strandColor = col.strand === "ICT" ? ictColor : gasColor
                const isDiv       = idx === divAfterIdx

                return (
                  <div
                    key={col.name}
                    data-col={col.name}
                    style={{
                      width: COL_W, minWidth: COL_W, flexShrink: 0,
                      height: gridH,
                      position: "relative",
                      borderRight: isDiv ? `2px solid ${divBdr}` : `1px solid ${bdr}`,
                      overflow: "hidden",
                    }}
                  >
                    {/* Strand top colour bar */}
                    <div style={{
                      position:"absolute", top:0, left:0, right:0,
                      height:3, background:strandColor, opacity:0.55,
                      pointerEvents:"none", zIndex:1,
                    }} />

                    {/* Row stripes + horizontal lines */}
                    {timeLabels.slice(0,-1).map((m, i) => (
                      <div key={m} style={{
                        position:"absolute", left:0, right:0,
                        top: i * SLOT_H, height: SLOT_H,
                        background: m % 60 === 0 ? hourBg : "transparent",
                        borderBottom:`1px solid ${m % 60 === 0 ? hourLine : slotLine}`,
                        pointerEvents:"none",
                      }} />
                    ))}

                    {/* Schedule blocks — this section ONLY */}
                    {colRows.map(r => (
                      <ScheduleBlock
                        key={r.id}
                        row={r}
                        timeStart={timeStart}
                        timeEnd={timeEnd}
                        isDarkMode={isDarkMode}
                        onDragStart={onBlockDragStart}
                        onEdit={onEdit}
                      />
                    ))}

                    {/* Empty column: very subtle dot */}
                    {colRows.length === 0 && (
                      <div style={{
                        position:"absolute", inset:0,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        pointerEvents:"none", opacity:0.10,
                      }}>
                        <div style={{
                          width:20, height:20, borderRadius:"50%",
                          border:`2px dashed ${strandColor}`,
                        }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
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

  // ── Colors — SaaS premium palette ────────────────────────────────────────
  const ictColor  = "#2563eb"
  const gasColor  = "#d97706"
  const ictBg     = isDarkMode ? "rgba(37,99,235,0.08)"    : "rgba(37,99,235,0.03)"
  const gasBg     = isDarkMode ? "rgba(217,119,6,0.08)"    : "rgba(217,119,6,0.03)"
  // Divider: visible line between ICT and GAS
  const divBdr    = isDarkMode ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.25)"
  const hourBg    = isDarkMode ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)"
  const slotLine  = isDarkMode ? "rgba(255,255,255,0.04)"  : "rgba(0,0,0,0.04)"
  const hourLine  = isDarkMode ? "rgba(255,255,255,0.08)"  : "rgba(0,0,0,0.08)"
  const timeMajor = isDarkMode ? "rgba(148,163,184,0.95)" : "rgba(51,65,85,0.88)"
  const timeMinor = isDarkMode ? "rgba(100,116,139,0.50)" : "rgba(148,163,184,0.65)"
  const hdrBg     = isDarkMode ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)"

  // ── Time labels: one per slot, inclusive of end (for last border) ─────────
  const timeLabels: number[] = []
  for (let m = timeStart; m <= timeEnd; m += SLOT_MINS) timeLabels.push(m)
  const gridH   = (timeLabels.length - 1) * SLOT_H
  const contentW = TIME_W + cols.length * COL_W

  // Divider: after last ICT column, BOTH mode only
  const divAfterIdx = (isBoth && showICT && showGAS) ? ictSections.length - 1 : -1

  const ictPeriods = dayRows.filter(r => ictSections.includes(r.section)).length
  const gasPeriods = dayRows.filter(r => gasSections.includes(r.section)).length

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
        className="rounded-[20px] sm:rounded-[24px] border overflow-hidden"
        style={{
          background: isDarkMode ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.8)",
          borderColor: bdr,
          width: "fit-content",
          minWidth: "100%",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.2s ease, transform 0.2s ease",
          boxShadow: isDarkMode
            ? "0 4px 24px -4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)"
            : "0 4px 24px -4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
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
            */}
            <div style={{
              display: "flex",
              position: "sticky",
              top: 0,
              zIndex: 30,
              background: hdrBg,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
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
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: ictColor, flexShrink: 0,
                    boxShadow: `0 0 8px ${ictColor}50`,
                  }} />
                  <span style={{
                    fontSize: "9px", fontWeight: 900, letterSpacing: "0.25em",
                    textTransform: "uppercase", color: ictColor,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    ICT Strand — {ictSections.length} section{ictSections.length!==1?"s":""}
                  </span>
                  <span style={{
                    marginLeft: "auto", flexShrink: 0,
                    fontSize: "8px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                    color: isDarkMode ? "rgba(96,165,250,0.7)" : "rgba(37,99,235,0.5)",
                    background: isDarkMode ? "rgba(37,99,235,0.12)" : "rgba(37,99,235,0.06)",
                    padding: "2px 8px", borderRadius: 99,
                  }}>
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
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: gasColor, flexShrink: 0,
                    boxShadow: `0 0 8px ${gasColor}50`,
                  }} />
                  <span style={{
                    fontSize: "9px", fontWeight: 900, letterSpacing: "0.25em",
                    textTransform: "uppercase", color: gasColor,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    GAS Strand — {gasSections.length} section{gasSections.length!==1?"s":""}
                  </span>
                  <span style={{
                    marginLeft: "auto", flexShrink: 0,
                    fontSize: "8px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                    color: isDarkMode ? "rgba(251,191,36,0.7)" : "rgba(217,119,6,0.5)",
                    background: isDarkMode ? "rgba(217,119,6,0.12)" : "rgba(217,119,6,0.06)",
                    padding: "2px 8px", borderRadius: 99,
                  }}>
                    {gasPeriods} period{gasPeriods!==1?"s":""}
                  </span>
                </div>
              )}
            </div>

            {/*
              ── STICKY SECTION COLUMN HEADERS ─────────────────────────────
            */}
            <div style={{
              display: "flex",
              position: "sticky",
              top: 40,
              zIndex: 20,
              background: hdrBg,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
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
                    borderRight: isDiv ? `2px solid ${divBdr}` : `1px solid ${bdr}`,
                    overflow: "hidden",
                  }}>
                    <p style={{
                      fontSize: "11px", fontWeight: 900,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {col.name}
                    </p>
                    <p style={{
                      fontSize: "7.5px", fontWeight: 700, marginTop: 2,
                      color: isDarkMode ? "rgba(100,116,139,0.7)" : "rgba(148,163,184,0.8)",
                    }}>
                      {count} period{count!==1?"s":""}
                    </p>
                  </div>
                )
              })}
            </div>

            {/*
              ── GRID BODY ──────────────────────────────────────────────────
            */}
            <div style={{ display:"flex", width:contentW, height:gridH }}>

              {/* TIME AXIS — sticky left, z-index above schedule blocks */}
              <div style={{
                width: TIME_W, minWidth: TIME_W, flexShrink: 0,
                height: gridH,
                position: "sticky", left: 0, zIndex: 15,
                background: isDarkMode ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
                borderRight: `1px solid ${bdr}`,
                overflow: "hidden",
              }}>
                {timeLabels.map((m, i) => {
                  const isHour = m % 60 === 0
                  return (
                    <div key={m} style={{
                      position: "absolute",
                      top: i * SLOT_H,
                      left: 0, right: 0,
                      height: SLOT_H,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "flex-end",
                      paddingRight: 12,
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
                      height:2,
                      background: `linear-gradient(90deg, ${strandColor}80, ${strandColor}30)`,
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
                        pointerEvents:"none", opacity:0.08,
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
"use client"

import { useState, useEffect } from "react"
import { Loader2, X, Save, AlertCircle, Edit3, Trash2, Clock, ChevronDown, Search, Globe, Link } from "lucide-react"
import { ScheduleRow, toMins, toDisp, toStr, TIME_OPTS } from "./types"

import { useRooms, Room } from "../../sections/hooks/useRooms"

interface Props {
  row: ScheduleRow
  editStart: number
  editEnd: number
  day: string
  saving: boolean
  deleting: boolean
  isDarkMode: boolean
  surf: string; bdr: string; txt: string; muted: string
  teachers: { id: string; full_name: string }[]
  onChangeRow: (updated: ScheduleRow) => void
  onChangeStart: (m: number) => void
  onChangeEnd: (m: number) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}

// ── Shared dropdown props ─────────────────────────────────────────────────────
interface DropProps {
  isDarkMode: boolean; surf: string; bdr: string; txt: string; muted: string
}

// ── Time picker dropdown ──────────────────────────────────────────────────────
function TimeSelect({
  value, options, isDarkMode, surf, bdr, txt, muted, onChange,
}: DropProps & {
  value: number
  options: { value: string; label: string }[]
  onChange: (m: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  // Group by AM / PM
  const amOpts  = filtered.filter(o => o.label.includes("AM"))
  const pmOpts  = filtered.filter(o => o.label.includes("PM"))

  const overlayBg = isDarkMode ? "rgba(15,23,42,0.98)"    : "rgba(255,255,255,0.98)"
  const shadow    = isDarkMode
    ? "0 20px 48px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)"
    : "0 20px 48px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)"
  const rowHov    = isDarkMode ? "rgba(30,41,59,0.9)"     : "#f8fafc"
  const activeRow = isDarkMode ? "rgba(37,99,235,0.18)"   : "#eff6ff"
  const activeTxt = isDarkMode ? "#93c5fd"                : "#1d4ed8"
  const groupLbl  = isDarkMode ? "rgba(100,116,139,0.7)"  : "rgba(148,163,184,0.9)"
  const inputBg   = isDarkMode ? "rgba(30,41,59,0.9)"     : "#f8fafc"

  const displayLabel = options.find(o => toMins(o.value) === value)?.label ?? toDisp(value)

  // Parse display for styled rendering
  const parts = displayLabel.match(/^(\d+:\d+)\s*(AM|PM)$/)

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery("") }}
        style={{
          width: "100%", height: 44, borderRadius: 14,
          border: `1.5px solid ${open ? "#3b82f6" : bdr}`,
          background: isDarkMode ? "rgba(30,41,59,0.5)" : "rgba(248,250,252,0.8)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 12px 0 14px", cursor: "pointer",
          outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
          boxShadow: open
            ? "0 0 0 3px rgba(59,130,246,0.15), 0 2px 8px rgba(59,130,246,0.08)"
            : isDarkMode ? "0 1px 3px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
          <Clock size={12} style={{ color: open ? "#3b82f6" : muted, marginBottom: -1 }} />
          {parts ? (
            <span style={{ fontSize: 13, fontWeight: 800, color: txt, marginLeft: 4 }}>
              {parts[1]}
              <span style={{ fontSize: 10, fontWeight: 700, color: open ? "#3b82f6" : muted, marginLeft: 3 }}>
                {parts[2]}
              </span>
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 800, color: txt, marginLeft: 4 }}>{displayLabel}</span>
          )}
        </div>
        <ChevronDown size={13} style={{ color: muted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
          zIndex: 300,
          background: overlayBg, border: `1px solid ${isDarkMode ? "rgba(51,65,85,0.6)" : "rgba(226,232,240,0.8)"}`,
          borderRadius: 16, boxShadow: shadow, overflow: "hidden",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        }}>
          {/* Search */}
          <div style={{ padding: "10px 10px 6px" }}>
            <div style={{ position: "relative" }}>
              <Clock size={12} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: muted }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Search "7:30" or "1pm"…'
                style={{
                  width: "100%", height: 36, borderRadius: 10,
                  border: `1px solid ${bdr}`, background: inputBg,
                  paddingLeft: 30, paddingRight: 10, fontSize: 11,
                  fontWeight: 600, color: txt, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: 220, overflowY: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
            {[{ label: "Morning", opts: amOpts }, { label: "Afternoon", opts: pmOpts }].map(group =>
              group.opts.length === 0 ? null : (
                <div key={group.label}>
                  <div style={{
                    padding: "6px 14px 3px",
                    fontSize: 8, fontWeight: 800, textTransform: "uppercase",
                    letterSpacing: "0.12em", color: groupLbl,
                  }}>
                    {group.label}
                  </div>
                  {group.opts.map(opt => {
                    const m      = toMins(opt.value)
                    const active = m === value
                    const p      = opt.label.match(/^(\d+:\d+)\s*(AM|PM)$/)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { onChange(m); setOpen(false); setQuery("") }}
                        style={{
                          width: "100%", padding: "8px 16px",
                          display: "flex", alignItems: "baseline", justifyContent: "space-between",
                          background: active ? activeRow : "transparent",
                          border: "none", cursor: "pointer",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = rowHov }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                      >
                        <span style={{ fontSize: 16, fontWeight: 700, color: active ? activeTxt : txt }}>
                          {p ? p[1] : opt.label}
                        </span>
                        {p && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: active ? activeTxt : muted }}>
                            {p[2]}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            )}
            {filtered.length === 0 && (
              <div style={{ padding: "14px", fontSize: 10, color: muted, textAlign: "center" }}>No results</div>
            )}
          </div>
        </div>
      )}

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => { setOpen(false); setQuery("") }} />
      )}
    </div>
  )
}

// ── Searchable select (teacher / room) ────────────────────────────────────────
function SearchableSelect({
  value, options, placeholder, isDarkMode, surf, bdr, txt, muted, onChange,
}: DropProps & {
  value: string; options: string[]; placeholder: string
  onChange: (v: string) => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  const overlayBg = isDarkMode ? "rgba(15,23,42,0.98)"   : "rgba(255,255,255,0.98)"
  const shadow    = isDarkMode
    ? "0 20px 48px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)"
    : "0 20px 48px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)"
  const rowHov    = isDarkMode ? "rgba(30,41,59,0.9)"    : "#f8fafc"
  const activeRow = isDarkMode ? "rgba(37,99,235,0.18)"  : "#eff6ff"
  const activeTxt = isDarkMode ? "#93c5fd"               : "#1d4ed8"
  const inputBg   = isDarkMode ? "rgba(30,41,59,0.9)"    : "#f8fafc"

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery("") }}
        style={{
          width: "100%", height: 44, borderRadius: 14,
          border: `1.5px solid ${open ? "#3b82f6" : bdr}`,
          background: isDarkMode ? "rgba(30,41,59,0.5)" : "rgba(248,250,252,0.8)",
          color: value ? txt : muted,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 12px 0 16px", fontSize: 12, fontWeight: 700,
          cursor: "pointer", outline: "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxShadow: open
            ? "0 0 0 3px rgba(59,130,246,0.15), 0 2px 8px rgba(59,130,246,0.08)"
            : isDarkMode ? "0 1px 3px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || placeholder}
        </span>
        <ChevronDown size={13} style={{ color: muted, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
          zIndex: 300,
          background: overlayBg, border: `1px solid ${isDarkMode ? "rgba(51,65,85,0.6)" : "rgba(226,232,240,0.8)"}`,
          borderRadius: 16, boxShadow: shadow, overflow: "hidden",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        }}>
          <div style={{ padding: "10px 10px 6px", borderBottom: `1px solid ${bdr}` }}>
            <div style={{ position: "relative" }}>
              <Search size={11} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: muted }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                style={{
                  width: "100%", height: 34, borderRadius: 10,
                  border: `1px solid ${bdr}`, background: inputBg,
                  paddingLeft: 28, paddingRight: 10, fontSize: 11,
                  fontWeight: 600, color: txt, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false) }}
              style={{
                width: "100%", padding: "7px 14px", textAlign: "left",
                fontSize: 8.5, fontWeight: 800, textTransform: "uppercase",
                letterSpacing: "0.1em", color: muted,
                background: "transparent", border: "none",
                borderBottom: `1px solid ${bdr}`, cursor: "pointer",
              }}
            >
              Clear selection
            </button>
          )}

          <div style={{ maxHeight: 200, overflowY: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 10, color: muted, textAlign: "center" }}>No results</div>
            ) : filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); setQuery("") }}
                style={{
                  width: "100%", padding: "9px 16px", textAlign: "left",
                  fontSize: 12, fontWeight: opt === value ? 800 : 600,
                  color: opt === value ? activeTxt : txt,
                  background: opt === value ? activeRow : "transparent",
                  border: "none", cursor: "pointer", display: "block",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = rowHov }}
                onMouseLeave={e => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => { setOpen(false); setQuery("") }} />
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function EditModal({
  row, editStart, editEnd, day,
  saving, deleting, isDarkMode,
  surf, bdr, txt, muted,
  teachers,
  onChangeRow, onChangeStart, onChangeEnd,
  onSave, onDelete, onClose,
}: Props) {
  const roomsList = useRooms()
  const roomNames = roomsList.map((r: Room) => r.name)
  const teacherNames = teachers.map(t => t.full_name)
  const labelStyle: React.CSSProperties = {
    fontSize: 8.5, fontWeight: 800, textTransform: "uppercase",
    letterSpacing: "0.3em", color: muted, display: "block", marginBottom: 6,
  }

  // ── Lock body scroll while modal is open ──────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  const startOpts = TIME_OPTS.filter(o => toMins(o.value) < editEnd)
  const endOpts   = TIME_OPTS.filter(o => toMins(o.value) > editStart)

  const modalSurf = isDarkMode ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.97)"
  const modalBdr  = isDarkMode ? "rgba(51,65,85,0.5)" : "rgba(226,232,240,0.7)"

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      className="items-end justify-center sm:items-center sm:p-4"
      onClick={onClose}
    >
      <style>{`
        @keyframes sheetUp {
          from { opacity:0; transform:translateY(32px) }
          to   { opacity:1; transform:translateY(0)    }
        }
        @keyframes modalPop {
          from { opacity:0; transform:scale(0.96) translateY(10px) }
          to   { opacity:1; transform:scale(1)    translateY(0)    }
        }
        .edit-modal-sheet { animation: sheetUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }
        @media (min-width:640px) {
          .edit-modal-sheet { animation: modalPop 0.24s cubic-bezier(0.16,1,0.3,1) both; }
        }
        .edit-modal-drag-handle {
          width: 36px; height: 4px; border-radius: 99px;
          margin: 10px auto 2px;
          background: rgba(148,163,184,0.35);
        }
        @media (min-width:640px) { .edit-modal-drag-handle { display: none; } }
      `}</style>

      <div
        style={{
          width: "100%", maxWidth: 480,
          background: modalSurf,
          border: `1px solid ${modalBdr}`,
          boxShadow: isDarkMode
            ? "0 32px 80px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 32px 80px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
          overflow: "hidden",
          maxHeight: "92dvh",
          display: "flex", flexDirection: "column",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        className="edit-modal-sheet rounded-t-[24px] sm:rounded-[24px] sm:max-h-[95dvh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="edit-modal-drag-handle" />

        {/* Header */}
        <div style={{
          padding: "14px 20px 16px",
          borderBottom: `1px solid ${modalBdr}`,
          background: isDarkMode ? "rgba(15,23,42,0.7)" : "rgba(248,250,252,0.9)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(124,58,237,0.1))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(59,130,246,0.1)",
            }}>
              <Edit3 size={16} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: txt, margin: 0 }}>
                Edit Period
              </p>
              <p style={{ fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: muted, margin: "2px 0 0" }}>
                {row.section} · {day}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10, border: "none",
              background: "transparent", cursor: "pointer", color: muted,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = isDarkMode ? "rgba(239,68,68,0.12)" : "#fef2f2";
              (e.currentTarget as HTMLElement).style.color = "#f87171";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = muted;
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body — scrollable if content overflows on small screens */}
        <div style={{
          padding: "20px 20px 20px",
          display: "flex", flexDirection: "column", gap: 16,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}>

          {/* Subject */}
          <div>
            <label style={labelStyle}>Subject</label>
            <input
              value={row.subject}
              onChange={e => onChangeRow({ ...row, subject: e.target.value })}
              style={{
                width: "100%", height: 44, borderRadius: 14,
                border: `1.5px solid ${bdr}`, background: "transparent",
                padding: "0 16px", fontSize: 12, fontWeight: 900,
                textTransform: "uppercase", letterSpacing: "0.04em",
                color: txt, outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={e => {
                (e.target as HTMLInputElement).style.borderColor = "#3b82f6";
                (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
              }}
              onBlur={e => {
                (e.target as HTMLInputElement).style.borderColor = bdr;
                (e.target as HTMLInputElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* Start / End time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Start</label>
              <TimeSelect
                value={editStart} options={startOpts}
                isDarkMode={isDarkMode} surf={surf} bdr={bdr} txt={txt} muted={muted}
                onChange={onChangeStart}
              />
            </div>
            <div>
              <label style={labelStyle}>End</label>
              <TimeSelect
                value={editEnd} options={endOpts}
                isDarkMode={isDarkMode} surf={surf} bdr={bdr} txt={txt} muted={muted}
                onChange={onChangeEnd}
              />
            </div>
          </div>

          {/* Teacher */}
          <div>
            <label style={labelStyle}>Teacher</label>
            <SearchableSelect
              value={row.teacher || ""} options={teacherNames}
              placeholder="Select teacher…"
              isDarkMode={isDarkMode} surf={surf} bdr={bdr} txt={txt} muted={muted}
              onChange={v => {
                const matched = teachers.find(t => t.full_name === v)
                onChangeRow({
                  ...row,
                  teacher: v || null,
                  teacher_id: matched?.id ?? row.teacher_id ?? null,
                })
              }}
            />
          </div>

          {/* Online toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderRadius: 14,
            background: row.is_online
              ? (isDarkMode ? "rgba(59,130,246,0.08)" : "rgba(239,246,255,0.8)")
              : (isDarkMode ? "rgba(30,41,59,0.4)" : "rgba(248,250,252,0.8)"),
            border: `1px solid ${row.is_online
              ? (isDarkMode ? "rgba(59,130,246,0.25)" : "rgba(147,197,253,0.5)")
              : bdr}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={13} style={{ color: row.is_online ? "#60a5fa" : muted }} />
              <div>
                <p style={{ margin: 0, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: row.is_online ? "#60a5fa" : txt }}>
                  Online Class
                </p>
                <p style={{ margin: 0, fontSize: 8, color: muted }}>
                  {row.is_online ? "No physical room required" : "Toggle for virtual class"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChangeRow({ ...row, is_online: !row.is_online, room: row.is_online ? row.room : null })}
              style={{
                position: "relative", width: 36, height: 18, borderRadius: 99, border: "none",
                background: row.is_online ? "#3b82f6" : (isDarkMode ? "#334155" : "#cbd5e1"),
                cursor: "pointer", flexShrink: 0, transition: "background 0.2s",
              }}>
              <span style={{
                position: "absolute", top: 2, width: 14, height: 14, borderRadius: "50%", background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transform: row.is_online ? "translateX(20px)" : "translateX(1px)",
                transition: "transform 0.2s",
              }} />
            </button>
          </div>

          {/* Room (hidden when online) */}
          {!row.is_online && (
            <div>
              <label style={labelStyle}>Room</label>
              <SearchableSelect
                value={row.room || ""} options={roomNames}
                placeholder="Select room…"
                isDarkMode={isDarkMode} surf={surf} bdr={bdr} txt={txt} muted={muted}
                onChange={v => onChangeRow({ ...row, room: v || null })}
              />
            </div>
          )}

          {/* Google Classroom link (shown when online) */}
          {row.is_online && (
            <div>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 4 }}>
                <Link size={9} style={{ color: "#60a5fa" }} /> Google Classroom Link
                <span style={{ opacity: 0.4, textTransform: "lowercase", fontWeight: 600, marginLeft: 2 }}>(optional)</span>
              </label>
              <input
                value={row.gclass_link ?? ""}
                onChange={e => onChangeRow({ ...row, gclass_link: e.target.value || null })}
                placeholder="https://classroom.google.com/c/..."
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 12,
                  border: `1px solid ${bdr}`, background: surf, color: txt,
                  fontSize: 11, fontWeight: 500, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Duration badge / error */}
          {editStart >= editEnd ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 14,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(248,113,113,0.3)",
            }}>
              <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f87171", margin: 0 }}>
                End time must be after start time
              </p>
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 14,
              background: isDarkMode ? "rgba(30,41,59,0.4)" : "rgba(248,250,252,0.8)",
              border: `1px solid ${isDarkMode ? "rgba(51,65,85,0.3)" : "rgba(226,232,240,0.6)"}`,
            }}>
              <Clock size={12} style={{ color: muted }} />
              <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: muted }}>
                {toDisp(editStart)} – {toDisp(editEnd)}
              </span>
              <span style={{
                marginLeft: "auto", fontSize: 9, fontWeight: 700,
                background: isDarkMode ? "rgba(59,130,246,0.15)" : "rgba(239,246,255,0.8)",
                color: isDarkMode ? "#93c5fd" : "#2563eb",
                padding: "2px 8px", borderRadius: 99,
                border: isDarkMode ? "1px solid rgba(59,130,246,0.15)" : "1px solid rgba(147,197,253,0.3)",
              }}>
                {editEnd - editStart} min
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button
              disabled={deleting}
              onClick={onDelete}
              style={{
                height: 44, padding: "0 14px", borderRadius: 14,
                border: `1.5px solid ${bdr}`, background: "transparent",
                color: muted, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = isDarkMode ? "rgba(239,68,68,0.1)" : "#fef2f2"
                el.style.borderColor = "rgba(248,113,113,0.4)"
                el.style.color = "#f87171"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "transparent"
                el.style.borderColor = bdr
                el.style.color = muted
              }}
            >
              {deleting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
            </button>

            <button
              onClick={onClose}
              style={{
                flex: 1, height: 44, borderRadius: 14,
                border: `1.5px solid ${bdr}`, background: "transparent",
                color: muted, cursor: "pointer",
                fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = isDarkMode ? "rgba(255,255,255,0.04)" : "#f8fafc"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              Cancel
            </button>

            <button
              disabled={saving || editStart >= editEnd}
              onClick={onSave}
              style={{
                flex: 1, height: 44, borderRadius: 14,
                border: "none",
                background: saving || editStart >= editEnd
                  ? "rgba(59,130,246,0.4)"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff", cursor: saving || editStart >= editEnd ? "not-allowed" : "pointer",
                fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: saving || editStart >= editEnd
                  ? "none"
                  : "0 4px 16px -2px rgba(37,99,235,0.45), 0 0 0 1px rgba(96,165,250,0.15)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (!saving && editStart < editEnd) (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, #1d4ed8, #1e40af)" }}
              onMouseLeave={e => { if (!saving && editStart < editEnd) (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
            >
              {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={12} />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
// src/app/admin/applicants/components/DocumentViewerModal.tsx
import { memo, useState, useRef, useEffect } from "react"
import {
  RotateCw, Download, X, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ZoomIn, ZoomOut, RefreshCcw, MousePointer2, GripVertical, Settings2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import screenfull from "screenfull"

interface DocumentViewerModalProps {
  viewerOpen: boolean
  setViewerOpen: (open: boolean) => void
  viewingFile: { url: string, label: string } | null
  rotation: number
  setRotation: React.Dispatch<React.SetStateAction<number>>
  onNavigate?: (direction: number) => void
  canNavigatePrev?: boolean
  canNavigateNext?: boolean
  isDarkMode?: boolean
}

export const DocumentViewerModal = memo(({
  viewerOpen, setViewerOpen, viewingFile, rotation, setRotation,
  onNavigate, canNavigatePrev, canNavigateNext,
  isDarkMode = true
}: DocumentViewerModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewerContainerRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    if (screenfull.isEnabled && viewerContainerRef.current) {
      if (screenfull.isFullscreen) {
        screenfull.exit();
      } else {
        screenfull.request(viewerContainerRef.current);
      }
    }
  }

  useEffect(() => {
    if (screenfull.isEnabled) {
      const changeHandler = () => setIsFullscreen(screenfull.isFullscreen)
      screenfull.on('change', changeHandler)
      return () => { screenfull.off('change', changeHandler) }
    }
  }, [])

  const handleDownload = async () => {
    if (!viewingFile) return;
    try {
      const response = await fetch(viewingFile.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = viewingFile.url.split('.').pop()?.split('?')[0] || 'jpg';
      a.download = `${viewingFile.label}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      window.open(viewingFile.url, '_blank');
    }
  }

  // Safely check for PDF using optional chaining
  const isPdf = viewingFile?.url?.toLowerCase().endsWith('.pdf')

  const gridBackground = {
    backgroundImage: `radial-gradient(circle at 1px 1px, ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.04)'} 1px, transparent 0)`,
    backgroundSize: `28px 28px`,
    backgroundColor: isDarkMode ? '#0a0b10' : '#f8fafc'
  }

  return (
    <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
      <DialogContent className="max-w-[98vw] md:max-w-[95vw] w-full p-0 overflow-hidden border-none shadow-2xl bg-transparent flex flex-col [&>button]:hidden h-[95vh]">

        <div
          ref={viewerContainerRef}
          className={`flex flex-col overflow-hidden transition-all duration-500 ease-out relative ring-1 
            ${isDarkMode ? 'bg-[#050505] ring-white/5 shadow-2xl' : 'bg-white ring-slate-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)]'}
            ${isFullscreen ? 'w-screen h-screen rounded-none' : 'w-full h-full rounded-[24px] md:rounded-[32px]'}`}
        >
          {/* HEADER BAR */}
          <div className={`relative px-5 py-4 z-30 flex flex-wrap gap-4 items-center justify-between shrink-0 border-b backdrop-blur-xl transition-colors duration-300
            ${isDarkMode ? 'bg-[#080808]/90 border-white/5' : 'bg-white/90 border-slate-100'}`}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
            <div className="flex-1 min-w-[200px] flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 size={12} className={isDarkMode ? "text-emerald-400" : "text-emerald-600"} />
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] leading-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Document Viewer
                </p>
              </div>
              <DialogTitle className={`font-bold tracking-tight text-lg md:text-xl leading-none truncate ${isDarkMode ? 'text-white/90' : 'text-slate-900'}`}>
                {viewingFile?.label || "Document Viewer"}
              </DialogTitle>
              <DialogDescription className="hidden">Document inspection canvas</DialogDescription>
            </div>

            <div className={`flex items-center gap-1 p-1 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              {!isPdf && (
                <Button variant="ghost" size="icon" onClick={() => setRotation(r => (r + 90) % 360)}
                  className={`rounded-xl h-9 w-9 transition-all ${isDarkMode ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`}
                  title="Rotate 90°">
                  <RotateCw size={16} />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleDownload}
                className={`rounded-xl h-9 w-9 transition-all ${isDarkMode ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`}
                title="Download Source">
                <Download size={16} />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen}
                className={`rounded-xl h-9 w-9 hidden md:flex transition-all ${isDarkMode ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`}
                title="Toggle Fullscreen">
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </Button>
              <div className={`w-[1px] h-4 mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-slate-300'}`} />
              <Button variant="ghost" size="icon" onClick={() => setViewerOpen(false)}
                className={`rounded-xl h-9 w-9 transition-all ${isDarkMode ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300' : 'text-red-500 hover:bg-red-50 hover:text-red-600'}`}
                title="Close Viewer">
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* ARTBOARD AREA */}
          <div className="flex-1 w-full h-full flex items-center justify-center relative transition-colors duration-300" style={gridBackground}>

            {/* FILE NAVIGATION (Left/Right) */}
            {onNavigate && canNavigatePrev && (
              <Button variant="ghost" size="icon" onClick={() => onNavigate(-1)}
                className={`absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-40 rounded-full hover:scale-105 h-12 w-12 md:h-14 md:w-14 border transition-all duration-200 
                ${isDarkMode ? 'bg-[#12141c]/80 backdrop-blur-md text-white/70 hover:text-white hover:bg-[#1a1c26] border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]' : 'bg-white/90 backdrop-blur-md text-slate-500 hover:text-slate-900 hover:bg-white border-slate-200 shadow-lg'}`}>
                <ChevronLeft size={28} strokeWidth={1.5} />
              </Button>
            )}

            {onNavigate && canNavigateNext && (
              <Button variant="ghost" size="icon" onClick={() => onNavigate(1)}
                className={`absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-40 rounded-full hover:scale-105 h-12 w-12 md:h-14 md:w-14 border transition-all duration-200 
                ${isDarkMode ? 'bg-[#12141c]/80 backdrop-blur-md text-white/70 hover:text-white hover:bg-[#1a1c26] border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]' : 'bg-white/90 backdrop-blur-md text-slate-500 hover:text-slate-900 hover:bg-white border-slate-200 shadow-lg'}`}>
                <ChevronRight size={28} strokeWidth={1.5} />
              </Button>
            )}

            <div className="w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden z-10">
              {isPdf ? (
                <div className="w-full h-full p-4 md:p-12">
                  {/* Safely fallback to an empty string if viewingFile is null */}
                  <iframe src={viewingFile?.url || ""} className={`w-full h-full rounded-2xl shadow-2xl border ${isDarkMode ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-slate-200'}`} title="PDF Viewer" />
                </div>
              ) : (
                <TransformWrapper
                  initialScale={1}
                  minScale={1}
                  maxScale={8}
                  centerOnInit={true}
                  centerZoomedOut={true}
                  limitToBounds={true}
                  wheel={{ step: 0.15, smoothStep: 0.005 }}
                  pinch={{ step: 5 }}
                  panning={{ velocityDisabled: true }}
                  doubleClick={{ disabled: false, step: 2, mode: "toggle" }}
                // Removed the invalid `animation` prop
                >
                  {/* Extracted state directly from instance to fix TS Error 2339 */}
                  {({ zoomIn, zoomOut, resetTransform, setTransform, instance }) => {
                    const currentState = instance?.transformState;

                    const panUp = () => {
                      if (currentState && currentState.scale > 1) {
                        setTransform(currentState.positionX, currentState.positionY + 250, currentState.scale, 200);
                      }
                    };

                    const panDown = () => {
                      if (currentState && currentState.scale > 1) {
                        setTransform(currentState.positionX, currentState.positionY - 250, currentState.scale, 200);
                      }
                    };

                    return (
                      <>
                        {/* UNIFIED GLASS COMMAND CENTER */}
                        <div className={`absolute bottom-6 md:bottom-8 right-6 md:right-8 z-40 flex items-center backdrop-blur-xl p-1.5 rounded-2xl border animate-in slide-in-from-bottom-4 duration-500 
                          ${isDarkMode ? 'bg-[#12141c]/80 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]' : 'bg-white/80 border-slate-200 shadow-xl'}`}>

                          <div className={`flex items-center gap-0.5 px-1 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                            <GripVertical size={14} className={`mr-1 ${isDarkMode ? 'text-white/20' : 'text-slate-400'}`} />
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={panDown}
                                className={`h-9 w-10 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm'}`}
                                title="Pan Down">
                                <ChevronDown size={20} />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={panUp}
                                className={`h-9 w-10 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm'}`}
                                title="Pan Up">
                                <ChevronUp size={20} />
                              </Button>
                            </div>
                          </div>

                          <div className={`w-[1px] h-6 mx-2 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

                          <div className="flex items-center gap-1 pr-1">
                            <Button variant="ghost" size="icon" onClick={() => zoomOut()}
                              className={`h-9 w-9 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'}`}>
                              <ZoomOut size={18} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => resetTransform()}
                              className={`h-9 w-9 rounded-xl transition-colors ${isDarkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700'}`}
                              title="Fit to canvas">
                              <RefreshCcw size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => zoomIn()}
                              className={`h-9 w-9 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'}`}>
                              <ZoomIn size={18} />
                            </Button>
                          </div>
                        </div>

                        <TransformComponent
                          wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing"
                          contentClass="!w-full !h-full flex items-center justify-center"
                        >
                          <img
                            src={viewingFile?.url}
                            alt="Document Render"
                            decoding="async"
                            className={`w-auto h-auto max-w-[95%] max-h-[90%] md:max-w-[90%] md:max-h-[90%] object-contain rounded-sm transform-gpu will-change-transform 
                              ${isDarkMode ? 'shadow-[0_0_40px_rgba(0,0,0,0.3)] bg-white/5 ring-1 ring-white/10' : 'shadow-xl bg-white ring-1 ring-slate-200'}`}
                            style={{
                              transform: `rotate(${rotation}deg) translateZ(0)`,
                              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            draggable={false}
                          />
                        </TransformComponent>
                      </>
                    )
                  }}
                </TransformWrapper>
              )}
            </div>
          </div>

          {/* STATUS FOOTER */}
          <div className={`py-2.5 px-5 z-30 border-t flex flex-col md:flex-row items-center justify-between shrink-0 gap-2 backdrop-blur-xl transition-colors duration-300
            ${isDarkMode ? 'bg-[#080808]/90 border-white/5' : 'bg-white/90 border-slate-100'}`}
          >
            <div className={`flex items-center gap-2 uppercase font-bold text-[9px] tracking-[0.15em] ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
              <MousePointer2 size={10} />
              {isPdf ? "Native PDF Render Engine" : "Canvas Active • Scroll to Zoom • Drag to Pan"}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
DocumentViewerModal.displayName = "DocumentViewerModal"
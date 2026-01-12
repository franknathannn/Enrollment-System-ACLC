import { memo } from "react"
import { RotateCw, Download, X, Maximize2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface DocumentViewerModalProps {
  viewerOpen: boolean
  setViewerOpen: (open: boolean) => void
  viewingFile: { url: string, label: string } | null
  rotation: number
  setRotation: React.Dispatch<React.SetStateAction<number>>
  onNavigate?: (direction: number) => void
  canNavigatePrev?: boolean
  canNavigateNext?: boolean
}

export const DocumentViewerModal = memo(({ 
  viewerOpen, setViewerOpen, viewingFile, rotation, setRotation, onNavigate, canNavigatePrev, canNavigateNext
}: DocumentViewerModalProps) => {
  return (
    <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] md:h-[95vh] p-0 rounded-[32px] md:rounded-[40px] overflow-hidden border-none shadow-2xl bg-slate-950/95 flex flex-col [&>button]:hidden">
        {/* HEADER BAR */}
        <div className="p-6 bg-slate-900 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Registrar Inspection Matrix</p>
            <DialogTitle className="text-white font-black uppercase text-xl leading-none">
              {viewingFile?.label}
            </DialogTitle>
            <DialogDescription className="hidden">High-resolution document view</DialogDescription>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="icon" onClick={() => setRotation(r => (r + 90) % 360)} className="rounded-full bg-white/10 hover:bg-white/20 text-white"><RotateCw size={20}/></Button>
            <Button variant="ghost" size="icon" onClick={async () => {
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
            }} className="rounded-full bg-white/10 hover:bg-white/20 text-white"><Download size={20}/></Button>
            <Button variant="ghost" size="icon" onClick={() => setViewerOpen(false)} className="rounded-full bg-red-500 hover:bg-red-600 text-white"><X size={20}/></Button>
          </div>
        </div>

        {/* INSPECTION AREA */}
        <div className="flex-1 w-full flex items-center justify-center p-4 md:p-12 overflow-hidden relative">
          {onNavigate && canNavigatePrev && (
            <Button variant="ghost" size="icon" onClick={() => onNavigate(-1)} className="absolute left-4 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white h-12 w-12"><ChevronLeft size={32} /></Button>
          )}
          <div className="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar">
          {viewingFile?.url.toLowerCase().endsWith('.pdf') ? (
            <iframe src={viewingFile.url} className="w-full h-full rounded-2xl bg-white border-none" title="PDF Viewer" />
          ) : (
            <div className="relative group cursor-zoom-in transition-transform duration-300" style={{ transform: `rotate(${rotation}deg)` }}>
              <img src={viewingFile?.url} alt="Inspection" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-500" />
            </div>
          )}
          </div>
          {onNavigate && canNavigateNext && (
            <Button variant="ghost" size="icon" onClick={() => onNavigate(1)} className="absolute right-4 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white h-12 w-12"><ChevronRight size={32} /></Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})
DocumentViewerModal.displayName = "DocumentViewerModal"
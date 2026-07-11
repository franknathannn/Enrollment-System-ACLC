"use client"

import { useState } from "react"
import { Share2, ThumbsUp, Check, Copy } from "lucide-react"

export default function ArticleActions() {
  const [shared, setShared] = useState(false)
  const [helpfulStatus, setHelpfulStatus] = useState<"idle" | "yes" | "no">("idle")

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        })
      } catch (err) {
        // user cancelled or share failed, fallback to copy
        fallbackCopy()
      }
    } else {
      fallbackCopy()
    }
  }

  const fallbackCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  return (
    <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      
      {/* Helpful Section */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Was this article helpful?
        </span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setHelpfulStatus("yes")}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${helpfulStatus === 'yes' ? 'bg-green-100 text-green-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            title="Yes"
          >
            <ThumbsUp size={16} className={helpfulStatus === 'yes' ? 'fill-current' : ''} />
          </button>
          <button 
            onClick={() => setHelpfulStatus("no")}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${helpfulStatus === 'no' ? 'bg-red-100 text-red-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            title="No"
          >
            <ThumbsUp size={16} className={`rotate-180 ${helpfulStatus === 'no' ? 'fill-current' : ''}`} />
          </button>
        </div>
        {helpfulStatus !== 'idle' && (
          <span className="text-xs font-bold text-[#003399] animate-in fade-in zoom-in duration-300">
            Thanks for your feedback!
          </span>
        )}
      </div>

      {/* Share Section */}
      <div className="flex items-center gap-3">
        <button 
          onClick={handleShare}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-100 hover:text-[#003399] transition-colors"
        >
          {shared ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />}
        </button>
      </div>

    </div>
  )
}

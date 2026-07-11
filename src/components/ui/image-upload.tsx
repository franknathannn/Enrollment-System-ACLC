"use client"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  className?: string
  bucket?: string
}

export function ImageUpload({ value, onChange, disabled, className = "", bucket = "public-assets" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const toastId = toast.loading('Uploading image...')

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
      
      onChange(data.publicUrl)
      toast.success('Image uploaded successfully', { id: toastId })
    } catch (error: any) {
      toast.error(error.message || 'Error uploading image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removeImage = () => {
    onChange("")
  }

  return (
    <div className={`space-y-4 w-full ${className}`}>
      {value ? (
        <div className="relative w-full aspect-video md:h-48 rounded-xl overflow-hidden group border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <img 
            src={value} 
            alt="Uploaded" 
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                type="button"
                onClick={removeImage}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transform hover:scale-110 transition-all shadow-md"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div 
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`
            w-full aspect-video md:h-48 rounded-xl border-2 border-dashed 
            flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-900' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/10'}
          `}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-2">
                <Upload size={20} />
              </div>
              <p className="text-sm font-medium dark:text-slate-300">Click to upload image</p>
              <p className="text-xs text-slate-500">Max size 50MB</p>
            </>
          )}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={uploadImage}
        disabled={disabled || uploading}
      />
    </div>
  )
}

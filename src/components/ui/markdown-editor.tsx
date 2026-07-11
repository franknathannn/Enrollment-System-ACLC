"use client"

import React, { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Quote } from 'lucide-react'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  isDarkMode?: boolean
}

export function MarkdownEditor({ value, onChange, placeholder, className = "", isDarkMode = false }: MarkdownEditorProps) {
  const textareaWriteRef = useRef<HTMLTextAreaElement>(null)
  const textareaSplitRef = useRef<HTMLTextAreaElement>(null)

  const insertText = (before: string, after: string, defaultText: string = '') => {
    // Determine which textarea is visible
    const activeTextarea = document.querySelector('textarea:focus') as HTMLTextAreaElement 
      || textareaWriteRef.current 
      || textareaSplitRef.current

    if (!activeTextarea) return

    const start = activeTextarea.selectionStart
    const end = activeTextarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    const textToInsert = selectedText || defaultText
    
    // Create new text
    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end)
    onChange(newText)

    // Restore focus and selection
    setTimeout(() => {
      activeTextarea.focus()
      const newCursorPos = start + before.length + (selectedText ? selectedText.length : 0)
      if (!selectedText && defaultText) {
        // Select the default text so they can type over it
        activeTextarea.setSelectionRange(start + before.length, start + before.length + defaultText.length)
      } else {
        activeTextarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault()
        insertText('**', '**')
      } else if (e.key === 'i') {
        e.preventDefault()
        insertText('*', '*')
      } else if (e.key === 'u') {
        e.preventDefault()
        insertText('<u>', '</u>')
      }
    }
  }

  const tools = [
    { icon: <Bold size={14} />, label: "Bold (Ctrl+B)", onClick: () => insertText('**', '**') },
    { icon: <Italic size={14} />, label: "Italic (Ctrl+I)", onClick: () => insertText('*', '*') },
    { icon: <Underline size={14} />, label: "Underline (Ctrl+U)", onClick: () => insertText('<u>', '</u>') },
    { icon: <List size={14} />, label: "Bullet List", onClick: () => insertText('- ', '') },
    { icon: <ListOrdered size={14} />, label: "Number List", onClick: () => insertText('1. ', '') },
    { icon: <Quote size={14} />, label: "Quote", onClick: () => insertText('> ', '') },
    { icon: <LinkIcon size={14} />, label: "Link", onClick: () => insertText('[', '](https://example.com)', 'link text') },
  ]

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm flex flex-col ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'} ${className}`}>
      <Tabs defaultValue="write" className="w-full h-full flex flex-col">
        <div className={`px-4 py-2 border-b flex items-center justify-between flex-wrap gap-2 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          <TabsList className="h-8 shrink-0">
            <TabsTrigger value="write" className="text-xs">Write</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
            <TabsTrigger value="split" className="text-xs hidden md:flex">Split View</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-1 bg-transparent border rounded-md p-1 overflow-x-auto">
            {tools.map((tool, i) => (
              <button
                key={i}
                type="button"
                onClick={tool.onClick}
                title={tool.label}
                className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Single Pane: Write */}
        <TabsContent value="write" className="flex-1 p-0 m-0">
          <Textarea
            ref={textareaWriteRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full h-full min-h-[300px] md:min-h-[400px] resize-none border-0 focus-visible:ring-0 p-4 rounded-none ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-900'}`}
          />
        </TabsContent>

        {/* Single Pane: Preview */}
        <TabsContent value="preview" className="flex-1 p-0 m-0 overflow-y-auto">
          <div className={`w-full h-full min-h-[300px] md:min-h-[400px] p-6 prose prose-sm max-w-none ${isDarkMode ? 'prose-invert bg-slate-950' : 'bg-white'} prose-a:text-blue-600`}>
            {value ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]} 
                rehypePlugins={[rehypeRaw]}
                components={{
                  a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-slate-500 italic">Nothing to preview...</p>
            )}
          </div>
        </TabsContent>

        {/* Split Pane: Desktop Only */}
        <TabsContent value="split" className="flex-1 p-0 m-0 hidden md:flex h-full min-h-[500px]">
          <div className={`w-1/2 h-full border-r flex flex-col ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <Textarea
              ref={textareaSplitRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`flex-1 w-full h-full resize-none border-0 focus-visible:ring-0 p-4 rounded-none ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-900'}`}
            />
          </div>
          <div className={`w-1/2 h-full p-6 overflow-y-auto prose prose-sm max-w-none ${isDarkMode ? 'prose-invert bg-slate-950' : 'bg-white'} prose-a:text-blue-600`}>
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>{value}</ReactMarkdown>
            ) : (
              <p className="text-slate-500 italic">Nothing to preview...</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

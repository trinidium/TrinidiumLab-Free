"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Link } from "lucide-react"

interface UrlInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (url: string, text?: string) => void
  title?: string
  description?: string
  placeholder?: string
  defaultUrl?: string
  defaultText?: string
}

export function UrlInputDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  title = "Insert Link",
  description = "Enter the URL you want to link to and the display text for the link.",
  placeholder = "https://example.com",
  defaultUrl = "",
  defaultText = ""
}: UrlInputDialogProps) {
  const [url, setUrl] = useState(defaultUrl)
  const [text, setText] = useState(defaultText)

  useEffect(() => {
    if (!open) {
      // Reset values when dialog closes
      setUrl(defaultUrl)
      setText(defaultText)
    } else {
      // Set initial values when dialog opens
      setUrl(defaultUrl)
      setText(defaultText)
    }
  }, [open, defaultUrl, defaultText])

  const handleConfirm = () => {
    if (url.trim()) {
      onConfirm(url.trim(), text.trim() || url.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submission if inside a form
      handleConfirm()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900/90 border-slate-700 backdrop-blur-sm max-w-md w-full">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 mx-auto mb-4">
            <Link className="h-6 w-6 text-blue-400" />
          </div>
          <AlertDialogTitle className="text-white text-center">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400 text-center">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label htmlFor="url-input" className="text-sm font-medium text-slate-300">
              URL
            </label>
            <Input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={placeholder}
              className="bg-slate-800/50 border-slate-600 text-white"
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="text-input" className="text-sm font-medium text-slate-300">
              Link Text (optional)
            </label>
            <Input
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Display text (optional, will use URL if empty)"
              className="bg-slate-800/50 border-slate-600 text-white"
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel 
            className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={!url.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Insert Link
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
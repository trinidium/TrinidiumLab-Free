"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Bold,
  Italic,
  Underline,
  Link,
  ImageIcon,
  Paperclip,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  FileText,
} from "lucide-react"
import { UrlInputDialog } from "@/components/url-input-dialog"

interface Attachment {
  id: string
  name: string
  size: number
  type: string
  url: string
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onInsertVariable?: (variable: string) => void
  showVariables?: boolean
  variables?: string[]
  attachments?: Attachment[]
  onAttachmentsChange?: (attachments: Attachment[]) => void
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type your message...",
  className = "",
  onInsertVariable,
  showVariables = true,
  variables = ["{name}", "{email}", "{company}"],
  attachments = [],
  onAttachmentsChange,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [savedRange, setSavedRange] = useState<Range | null>(null)
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [urlText, setUrlText] = useState("")
  const lastClickTime = useRef(0)

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    // Only focus if not already focused to avoid disrupting mouse selection
    if (editorRef.current && document.activeElement !== editorRef.current) {
      setTimeout(() => {
        if (editorRef.current && document.activeElement !== editorRef.current) {
          editorRef.current.focus()
        }
      }, 0)
    }
    // Update the editor content after formatting
    setTimeout(() => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }, 0)
  }

  const insertLink = () => {
    // Show the URL dialog
    setShowUrlDialog(true)
    setUrlValue("")
    setUrlText("")
  }

  const handleUrlConfirm = (url: string, text?: string) => {
    // Insert the link at the current cursor position
    if (url) {
      // Save current selection
      const selection = window.getSelection()
      let selectedText = ""
      
      if (selection && selection.rangeCount > 0) {
        selectedText = selection.toString()
      }
      
      // Create the HTML for the link
      let linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text || url}</a>`
      
      if (selectedText) {
        // If there's selected text, create a link with that text
        linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selectedText}</a>`
      } else if (text) {
        // If there's specific link text, use that
        linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
      } else {
        // Otherwise use the URL as the text
        linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
      }

      // Insert the link at the cursor position
      document.execCommand("insertHTML", false, linkHtml)
      
      // Update the editor content
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }
    
    setShowUrlDialog(false)
  }

  const insertImage = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && onAttachmentsChange) {
        const attachment: Attachment = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
        }
        onAttachmentsChange([...attachments, attachment])

        // Insert image placeholder in editor
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const img = document.createElement("img")
          img.src = attachment.url
          img.alt = file.name
          img.style.maxWidth = "100%"
          img.style.height = "auto"
          img.style.display = "block"
          img.style.margin = "8px 0"
          range.insertNode(img)
          range.setStartAfter(img)
          range.setEndAfter(img)
          selection.removeAllRanges()
          selection.addRange(range)
          handleInput()
        }
      }
    }
    input.click()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || !onAttachmentsChange) return

    const newAttachments: Attachment[] = []

    Array.from(files).forEach((file) => {
      const attachment: Attachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      }
      newAttachments.push(attachment)
    })

    onAttachmentsChange([...attachments, ...newAttachments])

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeAttachment = (id: string) => {
    if (onAttachmentsChange) {
      onAttachmentsChange(attachments.filter((att) => att.id !== id))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleInput = () => {
    if (editorRef.current) {
      // Clean up the HTML content for better email compatibility
      let content = editorRef.current.innerHTML
      
      // Normalize line breaks
      content = content.replace(/<div><br><\/div>/g, '<br>')
      content = content.replace(/<p><br><\/p>/g, '<br>')
      
      // Ensure proper line break handling
      content = content.replace(/<br\s*\/?>/g, '<br>')
      
      onChange(content)

      // Force text direction after content change
      if (editorRef.current) {
        editorRef.current.style.direction = "ltr"
        editorRef.current.style.textAlign = "left"
      }
    }
  }

  const insertVariable = (variable: string) => {
    if (onInsertVariable) {
      onInsertVariable(variable)
      return
    }

    if (!editorRef.current) return

    // Store current selection to avoid disrupting mouse selection
    const selection = window.getSelection()
    let range: Range

    // Check if there's already a selection
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0)
    } else if (savedRange && editorRef.current.contains(savedRange.commonAncestorContainer)) {
      // Use saved range if current selection is empty
      range = savedRange
      selection?.removeAllRanges()
      selection?.addRange(range)
    } else {
      // If no selection and no saved range, create one at the end
      range = document.createRange()
      range.selectNodeContents(editorRef.current)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }

    // Create variable span
    const span = document.createElement("span")
    span.className = "bg-blue-100 text-blue-800 px-1 rounded"
    span.textContent = variable
    span.style.direction = "ltr"
    span.style.unicodeBidi = "normal"

    // Insert the variable
    range.deleteContents()
    range.insertNode(span)

    // Add space after variable
    const space = document.createTextNode(" ")
    range.setStartAfter(span)
    range.insertNode(space)
    range.setStartAfter(space)
    range.setEndAfter(space)

    // Update selection
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
    }

    // Move focus to editor only after content has been inserted
    setTimeout(() => {
      if (editorRef.current && document.activeElement !== editorRef.current) {
        editorRef.current.focus()
      }
    }, 0)

    // Save the new cursor position
    setSavedRange(range.cloneRange())

    // Ensure editor maintains LTR direction
    editorRef.current.style.direction = "ltr"
    handleInput()
  }

  // More conservative cursor position saving that doesn't interfere with mouse selection
  const saveCursorPosition = () => {
    // Only save position if the editor is focused and we're not in the middle of a mouse selection
    if (document.activeElement === editorRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        // Save the range if it's within the editor
        if (editorRef.current?.contains(range.startContainer) || editorRef.current?.contains(range.endContainer)) {
          setSavedRange(range.cloneRange())
        }
      }
    }
  }

  const restoreCursorPosition = () => {
    // Don't restore if the editor already has a selection or isn't focused
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && document.activeElement === editorRef.current) {
      // Only skip if there's a visible selection (not just a cursor)
      const range = selection.getRangeAt(0)
      if (range && !range.collapsed) return
    }
    
    if (savedRange && editorRef.current && document.activeElement === editorRef.current) {
      const selection = window.getSelection()
      if (selection) {
        try {
          // Check if the saved range is still valid within the editor
          const startContainer = savedRange.startContainer
          const endContainer = savedRange.endContainer
          
          // Verify that both containers are still within the editor
          if (editorRef.current.contains(startContainer) && editorRef.current.contains(endContainer)) {
            selection.removeAllRanges()
            selection.addRange(savedRange)
          }
        } catch (e) {
          // If the range is invalid (e.g., content has changed significantly), 
          // just place cursor at the end
          const range = document.createRange()
          range.selectNodeContents(editorRef.current)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }
  }

  useEffect(() => {
    if (editorRef.current && !isPreview) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value
      }
      editorRef.current.style.direction = "ltr"
      editorRef.current.style.textAlign = "left"
    }
  }, [isPreview]) // 👈 remove `value` from dependencies

  // Effect to update the editor content when the value prop changes externally
  // We only update when the editor is not focused to avoid interfering with user input
  useEffect(() => {
    if (editorRef.current && !isPreview && document.activeElement !== editorRef.current) {
      // Only update content if it's different from the editor's current content
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value
        // Reset saved range since content was changed externally
        setSavedRange(null)
      }
      editorRef.current.style.direction = "ltr"
      editorRef.current.style.textAlign = "left"
    }
  }, [value, isPreview])
  
  // Effect to ensure proper text selection behavior
  useEffect(() => {
    if (editorRef.current) {
      // Apply the select-text behavior
      editorRef.current.style.userSelect = "text";
      editorRef.current.style.webkitUserSelect = "text";
      editorRef.current.style.MozUserSelect = "text";
      editorRef.current.style.msUserSelect = "text";
    }
  }, [])

  return (
    <div className={`border border-slate-600 rounded-lg bg-slate-700/50 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-600 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText("bold")}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText("italic")}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText("underline")}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 bg-slate-600" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText("justifyLeft")}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText("justifyCenter")}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText("justifyRight")}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 bg-slate-600" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText("insertUnorderedList")}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText("insertOrderedList")}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 bg-slate-600" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertImage}
          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        {onAttachmentsChange && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-600"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
          </>
        )}

        <div className="ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="text-slate-300 hover:bg-slate-600"
          >
            {isPreview ? "Edit" : "Preview"}
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-3">
        {isPreview ? (
          <div
            className="min-h-[120px] text-white prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={() => {
              // Don't save cursor position on blur to avoid interfering with mouse selection
            }}
            onFocus={() => {
              // Don't restore position immediately on focus to preserve native selection behavior
              // The browser handles selections naturally when editor receives focus
            }}
            onMouseDown={() => {
              // Don't save cursor position on mouse down to preserve native selection behavior
            }}
            onMouseUp={(e) => {
              // Triple click detection
              const now = Date.now();
              // Check if this is a triple click (within 300ms of the previous click and has detail >= 3)
              if (now - lastClickTime.current < 300 && e.detail >= 3) {
                e.preventDefault();
                const selection = window.getSelection();
                if (selection && editorRef.current) {
                  const range = document.createRange();
                  range.selectNodeContents(editorRef.current);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }
              lastClickTime.current = now;
              
              // Don't save position immediately on mouse up to preserve mouse selection
              // The browser should handle selection naturally
            }}
            onDoubleClick={(e) => {
              // Allow default behavior for double click which selects words
              // This enables proper word selection like in input fields
            }}
            onKeyUp={(e) => {
              // Handle Enter key for proper line breaks
              if (e.key === 'Enter') {
                setTimeout(() => {
                  handleInput();
                }, 0);
              }
            }}
            onKeyDown={(e) => {
              // Only save cursor position on certain keys to avoid interfering with mouse selection
              // Skip saving position for arrow keys, home, end when used without modifiers for normal typing
              if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
                setTimeout(() => {
                  saveCursorPosition();
                }, 0); // Small delay to let the browser process the event first
              }
            }}
            className="min-h-[120px] text-white outline-none select-text"
            style={{
              whiteSpace: "pre-wrap",
              direction: "ltr",
              textAlign: "left",
              unicodeBidi: "normal",
              writingMode: "horizontal-tb",
              textOrientation: "mixed",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              fontFamily: "inherit",
              lineHeight: "1.5",
              // Better handling of line breaks
              WebkitLineBreak: "after-white-space",
              lineBreak: "auto",
              // Ensure proper text selection
              userSelect: "text",
              MozUserSelect: "text",
              WebkitUserSelect: "text",
              MsUserSelect: "text",
            }}
            data-placeholder={placeholder}
            dir="ltr"
            lang="en"
          />
        )}
      </div>

      {/* Variables */}
      {showVariables && variables.length > 0 && !onInsertVariable && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">Available Variables:</span>
            {variables.map((variable) => (
              <Badge
                key={variable}
                variant="outline"
                role="button"
                tabIndex={0}
                onClick={() => insertVariable(variable)}
                className="text-slate-300 border-slate-600 cursor-pointer hover:bg-slate-600/40"
              >
                {variable}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-3 pb-3">
          <div className="space-y-2">
            <span className="text-xs text-slate-400">Attachments:</span>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 p-2 bg-slate-600/30 rounded border border-slate-600"
              >
                <FileText className="h-4 w-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{attachment.name}</p>
                  <p className="text-xs text-slate-400">{formatFileSize(attachment.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(attachment.id)}
                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <UrlInputDialog
        open={showUrlDialog}
        onOpenChange={setShowUrlDialog}
        onConfirm={handleUrlConfirm}
        title="Insert Link"
        description="Enter the URL you want to link to and the display text for the link."
        placeholder="https://example.com"
        defaultUrl={urlValue}
        defaultText={urlText}
      />
    </div>
  )
}
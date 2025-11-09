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
import { CheckCircle, AlertCircle, Info } from "lucide-react"

interface AlertMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  type?: "success" | "error" | "info"
  onConfirm?: () => void
  showCancel?: boolean
  onCancel?: () => void
}

export function AlertMessageDialog({ 
  open, 
  onOpenChange, 
  title,
  message,
  type = "info",
  onConfirm,
  showCancel = false,
  onCancel
}: AlertMessageDialogProps) {
  // Determine icon and background color based on type
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-400" />
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-400" />
      default:
        return <Info className="h-6 w-6 text-blue-400" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-500/10"
      case "error":
        return "bg-red-500/10"
      default:
        return "bg-blue-500/10"
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900/90 border-slate-700 backdrop-blur-sm">
        <AlertDialogHeader>
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getBgColor()} mx-auto mb-4`}>
            {getIcon()}
          </div>
          <AlertDialogTitle className="text-white text-center">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400 text-center whitespace-pre-wrap">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {showCancel && (
            <AlertDialogCancel 
              onClick={onCancel}
              className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
            >
              Cancel
            </AlertDialogCancel>
          )}
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            {showCancel ? "Confirm" : "OK"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
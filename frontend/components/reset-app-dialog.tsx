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
import { AlertTriangle } from "lucide-react"

interface ResetAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ResetAppDialog({ open, onOpenChange, onConfirm }: ResetAppDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-red-950/95 border-red-800 backdrop-blur-sm">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-900/50 mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <AlertDialogTitle className="text-white text-center">
            Reset Application
          </AlertDialogTitle>
          <AlertDialogDescription className="text-red-200 text-center">
            Localhost:3000 says: Reset application? This will clear leads, logs, and settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction 
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white border-red-500 border"
          >
            Reset Application
          </AlertDialogAction>
          <AlertDialogCancel className="w-full border-red-700 text-red-300 bg-transparent hover:bg-red-900/30">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
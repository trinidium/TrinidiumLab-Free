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
import { Users, AlertTriangle } from "lucide-react"

interface ClearLeadsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  leadCount: number
}

export function ClearLeadsDialog({ open, onOpenChange, onConfirm, leadCount }: ClearLeadsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-800/90 border-slate-700 backdrop-blur-sm">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <AlertDialogTitle className="text-white text-center">
            Clear All Leads
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400 text-center">
            Are you sure you want to clear all uploaded leads? This action cannot be undone.
            You will permanently delete {leadCount} lead{leadCount !== 1 ? 's' : ''}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction 
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white"
          >
            Clear Leads
          </AlertDialogAction>
          <AlertDialogCancel className="w-full border-slate-600 text-slate-300 bg-transparent hover:bg-slate-700/50">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
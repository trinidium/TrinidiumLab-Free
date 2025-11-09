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
import { Mail, AlertTriangle } from "lucide-react"

interface GmailRemoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function GmailRemoveDialog({ open, onOpenChange, onConfirm }: GmailRemoveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 backdrop-blur-sm">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <AlertDialogTitle className="text-white text-center">
            Remove Gmail Credentials
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300 text-center">
            Are you sure you want to remove your Gmail credentials and reset authentication?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction 
            onClick={onConfirm}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Remove Credentials
          </AlertDialogAction>
          <AlertDialogCancel className="w-full border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
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
import { Play } from "lucide-react"
import { Dispatch, SetStateAction } from "react"

interface StartCampaignDialogProps {
  open: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>>
  onConfirm: () => Promise<void>
  subject: string


  delaySeconds: number
  dailyLimit: number
}

export function StartCampaignDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  subject,


  delaySeconds,
  dailyLimit
}: StartCampaignDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900/90 border-slate-700 backdrop-blur-sm max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mx-auto mb-4">
            <Play className="h-6 w-6 text-green-400" />
          </div>
          <AlertDialogTitle className="text-white text-center">
            Start Email Campaign
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Are you sure you want to start the email campaign with the following settings?
          </AlertDialogDescription>
          <div className="space-y-2 mt-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subject:</span>
                  <span className="text-white truncate ml-2">{subject}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Delay:</span>
                  <span className="text-white">{delaySeconds} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Daily limit:</span>
                  <span className="text-white">{dailyLimit} emails</span>
                </div>
              </div>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction 
            onClick={handleConfirm}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
          >
            Start Campaign
          </AlertDialogAction>
          <AlertDialogCancel className="w-full border-slate-600 text-slate-300 bg-transparent hover:bg-slate-700/50">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
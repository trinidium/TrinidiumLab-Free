"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const PRIV_KEY = "trinidiumlab:privacy:2025-08"
const TNC_KEY = "trinidiumlab:tnc:2025-08"

export function PrivacyDialog() {
  const [open, setOpen] = React.useState(false)
  const [accepted, setAccepted] = React.useState(false)

  React.useEffect(() => {
    try {
      const privOk = localStorage.getItem(PRIV_KEY) === "true"
      const tncOk = localStorage.getItem(TNC_KEY) === "true"
      if (!privOk && tncOk) {
        setOpen(true)
        return
      }
      if (!privOk && !tncOk) {
        // Wait until T&C is accepted, then open privacy dialog
        const timer = setInterval(() => {
          const tncAccepted = localStorage.getItem(TNC_KEY) === "true"
          const privAccepted = localStorage.getItem(PRIV_KEY) === "true"
          if (tncAccepted && !privAccepted) {
            clearInterval(timer)
            setOpen(true)
          } else if (privAccepted) {
            clearInterval(timer)
          }
        }, 500)
        return () => clearInterval(timer)
      }
    } catch {
      // if localStorage not available, keep dialog open
      setOpen(true)
    }
  }, [])

  React.useEffect(() => {
    const handler = () => {
      try {
        localStorage.removeItem(PRIV_KEY)
      } catch {}
      setAccepted(false)
      setOpen(true)
    }
    window.addEventListener("trinidiumlab:open-privacy", handler as EventListener)
    return () => window.removeEventListener("trinidiumlab:open-privacy", handler as EventListener)
  }, [])

  const handleAgree = () => {
    if (!accepted) return
    try {
      localStorage.setItem(PRIV_KEY, "true")
    } catch {}
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    // Prevent closing until accepted
    if (!next && !(typeof window !== "undefined" && localStorage.getItem(PRIV_KEY) === "true")) {
      setOpen(true)
      return
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl bg-slate-900 border-slate-700 text-slate-200"
        onInteractOutside={(e) => {
          if (!(typeof window !== "undefined" && localStorage.getItem(PRIV_KEY) === "true")) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (!(typeof window !== "undefined" && localStorage.getItem(PRIV_KEY) === "true")) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white">Privacy Policy</DialogTitle>
          <DialogDescription className="text-slate-400">TrinidiumLab — Last updated: August 2025</DialogDescription>
        </DialogHeader>

        <div
          className="mt-2 max-h-[60vh] overflow-y-auto rounded-md border border-slate-700/60 p-4 text-sm leading-6 select-text"
          data-copyable
        >
          <p className="mb-4">
            Your privacy is important to us. This Privacy Policy explains what data we collect, how we use it, and your
            choices.
          </p>
          <ul className="list-disc pl-5 space-y-3 text-slate-300">
            <li>
              Data We Collect: We Don't collect anything as TrinidiumLab is a localhost app and in this case you're the virtual owner of this version(Not of the brand). 
            </li>
            <li>
              How We Use Data: To operate, provide features (like sending emails), and ensure
              reliability and security.
            </li>
            <li>
              Storage and Retention: Data is retained only as long as needed for the services or as required by law.
            </li>
            <li>
              Sharing: We do not sell your data. We may use trusted processors to provide infrastructure or analytics.
            </li>
            <li>
              Security: We use administrative and technical safeguards to protect your data. No method is 100% secure.
            </li>
            <li>
              Your Rights: Depending on your region, you may request access, correction, or deletion of your data.
            </li>
            <li>
              Contact: For questions, contact{" "}
              <a
                href="mailto:trinidium.1@gmail.com"
                className="text-blue-400 underline underline-offset-4 hover:text-blue-300"
              >
                trinidium.1@gmail.com
              </a>
              .
            </li>
          </ul>
          <p className="mt-4 text-slate-400 text-xs">
            By continuing, you acknowledge that you have read and agree to this Privacy Policy.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Checkbox id="agree-privacy" checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} />
          <Label htmlFor="agree-privacy" className="text-slate-300">
            I agree to the Privacy Policy of TrinidiumLab
          </Label>
        </div>

        <DialogFooter className="mt-2">
          <Button
            onClick={handleAgree}
            disabled={!accepted}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-60"
          >
            Agree and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

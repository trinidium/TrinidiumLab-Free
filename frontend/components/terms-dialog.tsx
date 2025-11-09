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

const TNC_KEY = "trinidiumlab:tnc:2025-08" // bump this to force re-consent in the future

export function TermsDialog() {
  const [open, setOpen] = React.useState(false)
  const [accepted, setAccepted] = React.useState(false)

  React.useEffect(() => {
    try {
      const ok = typeof window !== "undefined" && localStorage.getItem(TNC_KEY) === "true"
      if (!ok) setOpen(true)
    } catch {
      // if localStorage not available, keep dialog open
      setOpen(true)
    }
  }, [])

  React.useEffect(() => {
    const handler = () => {
      try {
        localStorage.removeItem(TNC_KEY)
      } catch {}
      setAccepted(false)
      setOpen(true)
    }
    window.addEventListener("trinidiumlab:open-tnc", handler as EventListener)
    return () => window.removeEventListener("trinidiumlab:open-tnc", handler as EventListener)
  }, [])

  const handleAgree = () => {
    if (!accepted) return
    try {
      localStorage.setItem(TNC_KEY, "true")
    } catch {}
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    // Prevent closing until accepted
    if (!next && !(typeof window !== "undefined" && localStorage.getItem(TNC_KEY) === "true")) {
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
          // Block click-outside until accepted
          if (!(typeof window !== "undefined" && localStorage.getItem(TNC_KEY) === "true")) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          // Block escape until accepted
          if (!(typeof window !== "undefined" && localStorage.getItem(TNC_KEY) === "true")) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white">Terms and Conditions</DialogTitle>
          <DialogDescription className="text-slate-400">TrinidiumLab — Last updated: August 2025</DialogDescription>
        </DialogHeader>

        <div
          className="mt-2 max-h-[60vh] overflow-y-auto rounded-md border border-slate-700/60 p-4 text-sm leading-6 select-text"
          data-copyable
        >
          <p className="mb-4">
            Welcome to TrinidiumLab! By using our software and services ("Tool"), you agree to the following terms and
            conditions:
          </p>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <span className="font-semibold">Use of the Tool</span>
              <div className="text-slate-300">
                <p>You agree to use TrinidiumLab responsibly and lawfully.</p>
                <p>You must provide accurate information and keep your account credentials secure.</p>
                <p>You are responsible for all actions taken using your account.</p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Intellectual Property</span>
              <div className="text-slate-300">
                TrinidiumLab owns all rights to the software, design, and content. You may not copy, modify, distribute,
                or create derivative works without our permission.
              </div>
            </li>
            <li>
              <span className="font-semibold">User Content and Privacy</span>
              <div className="text-slate-300">
                You retain ownership of your data but grant TrinidiumLab permission to process it to provide the
                service. We are committed to protecting your privacy. Please review our Privacy Policy for details.
              </div>
            </li>
            <li>
              <span className="font-semibold">Payment and Refunds</span>
              <div className="text-slate-300">
                All sales are final. We do not offer refunds except where required by law. You agree to pay all fees
                associated with your use of the Tool on time.
              </div>
            </li>
            <li>
              <span className="font-semibold">Limitation of Liability</span>
              <div className="text-slate-300">
                TrinidiumLab is provided "as is" without warranties of any kind. We are not liable for any damages
                arising from your use of the Tool.
              </div>
            </li>
            <li>
              <span className="font-semibold">Termination</span>
              <div className="text-slate-300">We may suspend or terminate your access if you violate these terms.</div>
            </li>
            <li>
              <span className="font-semibold">Changes to Terms</span>
              <div className="text-slate-300">
                We reserve the right to update these terms at any time. Continued use means acceptance.
              </div>
            </li>
            <li>
              <span className="font-semibold">Governing Law</span>
              <div className="text-slate-300">These terms are governed by the laws of [Your Country/State].</div>
            </li>
          </ol>
          <p className="mt-4 text-slate-300">
            If you have questions, contact us at{" "}
            <a
              href="mailto:trinidium.1@gmail.com"
              className="text-blue-400 underline underline-offset-4 hover:text-blue-300"
            >
              trinidium.1@gmail.com
            </a>
            .
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Checkbox id="agree" checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} />
          <Label htmlFor="agree" className="text-slate-300">
            I agree to the Terms and Conditions of TrinidiumLab
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

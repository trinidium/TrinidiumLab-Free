"use client"

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-slate-700/50 bg-slate-900/50 px-4 md:px-6 py-4 text-center">
      <p className="text-xs text-slate-400 select-text" data-copyable>
        © {year} TrinidiumLab. All rights reserved.
      </p>
    </footer>
  )
}

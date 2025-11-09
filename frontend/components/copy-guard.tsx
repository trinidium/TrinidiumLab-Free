"use client"

import * as React from "react"

function isEditable(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  const tag = target.tagName
  const editable = (target as HTMLElement).isContentEditable
  return editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

function isCopyableArea(target: EventTarget | null) {
  if (!(target instanceof Element)) return false

  // Check if the element or any parent has copyable data attribute
  let element = target as Element
  while (element && element !== document.body) {
    if (element.hasAttribute("data-copyable")) {
      return true
    }
    element = element.parentElement as Element
  }
  return false
}

export function CopyGuard() {
  React.useEffect(() => {
    const prevent = (e: Event) => {
      if (!isEditable(e.target) && !isCopyableArea(e.target)) {
        e.preventDefault()
      }
    }

    const preventSelect = (e: Event) => {
      if (!isEditable(e.target) && !isCopyableArea(e.target)) {
        e.preventDefault()
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const keyValue = e && e.key ? e.key : null

      if (keyValue === null || typeof keyValue !== 'string') return

      const key = keyValue.toLowerCase()
      const mod = e.metaKey || e.ctrlKey
      if (
        !isEditable(e.target) &&
        !isCopyableArea(e.target) &&
        mod &&
        (key === "c" || key === "x" || key === "a" || key === "s")
      ) {
        e.preventDefault()
      }
    }

    document.addEventListener("copy", prevent, true)
    document.addEventListener("cut", prevent, true)
    document.addEventListener("contextmenu", prevent, true)
    document.addEventListener("dragstart", prevent, true)
    document.addEventListener("selectstart", preventSelect, true)
    document.addEventListener("keydown", onKeyDown, true)

    return () => {
      document.removeEventListener("copy", prevent, true)
      document.removeEventListener("cut", prevent, true)
      document.removeEventListener("contextmenu", prevent, true)
      document.removeEventListener("dragstart", prevent, true)
      document.removeEventListener("selectstart", preventSelect, true)
      document.removeEventListener("keydown", onKeyDown, true)
    }
  }, [])

  return null
}

import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

function isMobileWidth() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, isMobileWidth, () => false)
}

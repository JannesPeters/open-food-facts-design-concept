import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// React Router doesn't reset the scroll position when the route changes, so
// after scrolling down one page and navigating to another, the new page keeps
// the old scroll offset — with a fixed header this hides the top of the new
// page's content. Reset to the top on forward ("PUSH"/"REPLACE") navigations.
//
// "POP" (browser back/forward) is intentionally left alone so the browser's
// native scroll restoration — and pages that restore their own scroll snapshot
// on return (e.g. SearchPage) — keep working.
function ScrollToTop() {
  const { pathname, search } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType === 'POP') {
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, search, navigationType])

  return null
}

export default ScrollToTop

import { ref, watch, onBeforeUnmount } from 'vue'

interface DragScrollReturn {
  elRef: ReturnType<typeof ref<HTMLElement | null>>
  isDragging: ReturnType<typeof ref<boolean>>
}

export function useDragScroll(): DragScrollReturn {
  const elRef = ref<HTMLElement | null>(null)
  const isDragging = ref(false)

  let startX = 0
  let scrollLeft = 0
  let animationId = 0
  let velocity = 0
  let lastX = 0
  let lastTime = 0
  let currentEl: HTMLElement | null = null

  function onMouseDown(e: MouseEvent) {
    const el = elRef.value
    if (!el) return

    isDragging.value = true
    startX = e.pageX - el.offsetLeft
    scrollLeft = el.scrollLeft
    lastX = e.pageX
    lastTime = Date.now()
    velocity = 0

    cancelAnimationFrame(animationId)
    el.style.userSelect = 'none'
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.value) return
    const el = elRef.value
    if (!el) return

    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = x - startX
    el.scrollLeft = scrollLeft - walk

    const now = Date.now()
    const dt = now - lastTime
    if (dt > 0) velocity = (e.pageX - lastX) / dt
    lastX = e.pageX
    lastTime = now
  }

  function stopDrag() {
    if (!isDragging.value) return
    isDragging.value = false
    const el = elRef.value
    if (!el) return

    el.style.userSelect = ''
    applyMomentum(el)
  }

  function applyMomentum(el: HTMLElement) {
    const deceleration = 0.92

    function step() {
      velocity *= deceleration
      if (Math.abs(velocity) < 0.3) return
      el.scrollLeft -= velocity * 16
      animationId = requestAnimationFrame(step)
    }

    animationId = requestAnimationFrame(step)
  }

  function attachListeners(el: HTMLElement) {
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('mouseleave', stopDrag)
    currentEl = el
  }

  function detachListeners() {
    if (currentEl) {
      currentEl.removeEventListener('mousedown', onMouseDown)
      currentEl = null
    }
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('mouseleave', stopDrag)
    cancelAnimationFrame(animationId)
  }

  // elRef가 실제 DOM 요소로 바뀌는 시점에 리스너 등록
  watch(elRef, (newEl, oldEl) => {
    if (oldEl) detachListeners()
    if (newEl) attachListeners(newEl)
  })

  onBeforeUnmount(() => {
    detachListeners()
  })

  return { elRef, isDragging }
}

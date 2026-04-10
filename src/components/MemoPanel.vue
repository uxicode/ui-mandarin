<template>
  <section class="memo-panel" aria-label="메모">
    <h2 class="memo-panel__heading">메모</h2>
    <div class="memo-panel__layout">
      <aside class="memo-panel__sidebar">
        <button type="button" class="memo-panel__new-btn" @click="onNewMemo">
          새 메모
        </button>
        <div v-if="memoStore.isLoading && memoStore.memos.length === 0" class="memo-panel__sidebar-loading" aria-busy="true">
          불러오는 중…
        </div>
        <ul v-else class="memo-panel__list" role="list">
          <li v-for="m in memoStore.memos" :key="m.id">
            <button
              type="button"
              class="memo-panel__list-item"
              :class="{ 'memo-panel__list-item--active': memoStore.selectedMemoId === m.id }"
              @click="selectMemoRow(m.id)"
            >
              <span class="memo-panel__list-title">{{ listTitle(m) }}</span>
              <span class="memo-panel__list-meta">{{ formatShortDate(m.updatedAt) }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <div class="memo-panel__editor-wrap">
        <template v-if="memoStore.selectedMemo">
          <div class="memo-panel__editor-toolbar">
            <button
              type="button"
              class="memo-panel__icon-btn"
              aria-label="메모 확대 보기"
              title="메모 확대 보기"
              @click="openExpanded"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="memo-panel__icon-svg" aria-hidden="true">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7M3 9V3h6M21 15v6h-6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button type="button" class="memo-panel__delete-btn" @click="onDeleteMemo">
              삭제
            </button>
          </div>
          <textarea
            v-model="draftBody"
            class="memo-panel__body-input"
            placeholder="메모 내용"
            rows="12"
            @input="scheduleSave"
            @blur="flushSave"
          />
        </template>
        <p v-else class="memo-panel__placeholder">
          목록에서 메모를 선택하거나 새 메모를 만드세요.
        </p>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showExpanded"
        class="memo-expand-backdrop"
      >
        <div
          ref="expandShellRef"
          class="memo-expand-shell"
          tabindex="-1"
          :style="{ width: `${modalWidthPx}px`, height: `${modalHeightPx}px` }"
          role="dialog"
          aria-modal="true"
          aria-labelledby="memo-expand-title"
        >
          <div
            class="memo-expand__grip memo-expand__grip--left"
            title="너비 조절"
            @mousedown.prevent="onGripStart('left', $event)"
          />
          <div class="memo-expand__inner">
            <div class="memo-expand__header">
              <h4 id="memo-expand-title" class="memo-expand__title">메모</h4>
              <button type="button" class="memo-expand__close" aria-label="닫기" @click="closeExpanded">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="memo-expand__close-svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
                </svg>
              </button>
            </div>
            <textarea
              v-model="draftBody"
              class="memo-expand__body-input"
              placeholder="메모 내용"
              @input="scheduleSave"
              @blur="flushSave"
            />
          </div>
          <div
            class="memo-expand__grip memo-expand__grip--right"
            title="너비 조절"
            @mousedown.prevent="onGripStart('right', $event)"
          />
          <div
            class="memo-expand__corner memo-expand__corner--nw"
            title="크기 조절"
            aria-hidden="true"
            @mousedown.prevent="onCornerGripStart('nw', $event)"
          />
          <div
            class="memo-expand__corner memo-expand__corner--ne"
            title="크기 조절"
            aria-hidden="true"
            @mousedown.prevent="onCornerGripStart('ne', $event)"
          />
          <div
            class="memo-expand__corner memo-expand__corner--sw"
            title="크기 조절"
            aria-hidden="true"
            @mousedown.prevent="onCornerGripStart('sw', $event)"
          />
          <div
            class="memo-expand__corner memo-expand__corner--se"
            title="크기 조절"
            aria-hidden="true"
            @mousedown.prevent="onCornerGripStart('se', $event)"
          />
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useMemoStore } from '@/stores/memo-store'
import type { Memo } from '@/types/memo'

const memoStore = useMemoStore()
const { selectedMemo } = storeToRefs(memoStore)

const draftBody = ref('')

/** 저장 시 title: 본문 앞부분 최대 20자(유니코드 스칼라 기준). */
const MEMO_TITLE_FROM_BODY_MAX = 20

/** 저장·API용 title: 선행 공백 제거 후 유니코드 스칼라 기준 최대 MEMO_TITLE_FROM_BODY_MAX자까지 잘라 반환. */
function titleFromMemoBody(body: string): string {
  const trimmedStart = body.replace(/^\s+/, '')
  return Array.from(trimmedStart).slice(0, MEMO_TITLE_FROM_BODY_MAX).join('')
}

const showExpanded = ref(false)
const modalWidthPx = ref(720)
const modalHeightPx = ref(560)
const expandShellRef = ref<HTMLElement | null>(null)

const MODAL_WIDTH_MIN = 400
const MODAL_HEIGHT_MIN = 280

/** 확대 모달 너비 상한(뷰포트 기준, 최대 1200px). SSR 시 1200. */
function modalWidthMax(): number {
  if (typeof window === 'undefined') return 1200
  return Math.min(1200, window.innerWidth - 32)
}

/** 확대 모달 높이 상한(뷰포트 기준, 최대 900px). SSR 시 900. */
function modalHeightMax(): number {
  if (typeof window === 'undefined') return 900
  return Math.min(900, window.innerHeight - 32)
}

/** 모달 너비를 최소·최대 범위로 클램프. */
function clampModalWidth(w: number): number {
  return Math.max(MODAL_WIDTH_MIN, Math.min(modalWidthMax(), w))
}

/** 모달 높이를 최소·최대 범위로 클램프. */
function clampModalHeight(h: number): number {
  return Math.max(MODAL_HEIGHT_MIN, Math.min(modalHeightMax(), h))
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let gripUp: (() => void) | null = null

/** 확대 레이어 열린 상태에서 Escape로 닫기. */
function onExpandedEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') closeExpanded()
}

/** 현재 메모 저장 반영 후 확대 모달을 연다. 크기 클램프 후 포커스 이동. */
async function openExpanded() {
  flushSave()
  if (!memoStore.selectedMemoId) return
  modalWidthPx.value = clampModalWidth(modalWidthPx.value)
  modalHeightPx.value = clampModalHeight(modalHeightPx.value)
  showExpanded.value = true
  await nextTick()
  expandShellRef.value?.focus()
}

/** 저장 후 확대 모달을 닫는다. */
function closeExpanded() {
  flushSave()
  showExpanded.value = false
}

/** 좌/우 그립 드래그로 모달 너비 조절. */
function onGripStart(edge: 'left' | 'right', e: MouseEvent) {
  if (gripUp) gripUp()
  const startX = e.clientX
  const startW = modalWidthPx.value

  /** 마우스 이동 시 너비 갱신. */
  function onMove(ev: MouseEvent) {
    const dx = ev.clientX - startX
    modalWidthPx.value = clampModalWidth(edge === 'right' ? startW + dx : startW - dx)
  }

  /** 드래그 종료 시 리스너·커서 정리. */
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    gripUp = null
  }

  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  gripUp = onUp
}

type CornerGrip = 'nw' | 'ne' | 'sw' | 'se'

const CORNER_CURSOR: Record<CornerGrip, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
}

/** 모서리 드래그로 너비·높이 동시 조절. */
function onCornerGripStart(corner: CornerGrip, e: MouseEvent) {
  if (gripUp) gripUp()
  const startX = e.clientX
  const startY = e.clientY
  const startW = modalWidthPx.value
  const startH = modalHeightPx.value

  /** 코너 방향에 따라 크기 계산 후 클램프. */
  function onMove(ev: MouseEvent) {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    let w = startW
    let h = startH
    if (corner === 'se') {
      w = startW + dx
      h = startH + dy
    } else if (corner === 'sw') {
      w = startW - dx
      h = startH + dy
    } else if (corner === 'ne') {
      w = startW + dx
      h = startH - dy
    } else {
      w = startW - dx
      h = startH - dy
    }
    modalWidthPx.value = clampModalWidth(w)
    modalHeightPx.value = clampModalHeight(h)
  }

  /** 드래그 종료 시 리스너·커서 정리. */
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    gripUp = null
  }

  document.body.style.cursor = CORNER_CURSOR[corner]
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  gripUp = onUp
}

/** 창 크기 변경 시 모달 크기가 화면 밖으로 나가지 않게 재클램프. */
function onWindowResize() {
  modalWidthPx.value = clampModalWidth(modalWidthPx.value)
  modalHeightPx.value = clampModalHeight(modalHeightPx.value)
}

/** 확대 모달 열림 시 body 스크롤 잠금 및 Escape 리스너 등록. */
watch(showExpanded, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) document.addEventListener('keydown', onExpandedEscape)
  else document.removeEventListener('keydown', onExpandedEscape)
})

/** 선택된 메모가 바뀌면 편집 초안(draftBody)을 동기화. */
watch(
  selectedMemo,
  (m) => {
    draftBody.value = m?.body ?? ''
  },
  { immediate: true }
)

/** 사이드바 목록에 표시할 한 줄 제목(본문 미리보기 또는 저장 title). */
function listTitle(m: Memo): string {
  const s = (m.body ?? '').replace(/^\s+/, '')
  if (!s) {
    const t = (m.title ?? '').trim()
    return t || '제목 없음'
  }
  const chars = Array.from(s)
  const max = 48
  const preview = chars.slice(0, max).join('')
  return chars.length > max ? `${preview}…` : preview
}

/** updatedAt 등 ISO 문자열을 M/D 형태로 짧게 표시. */
function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return ''
  }
}

/** 에디터 초안이 스토어의 본문과 동일한지. */
function isDraftUnchanged(): boolean {
  const m = selectedMemo.value
  if (!m) return true
  return draftBody.value === m.body
}

/** 다른 행 선택 전 현재 메모를 저장하고 id로 선택 전환. */
function selectMemoRow(id: string) {
  flushSave()
  memoStore.selectMemo(id)
}

/** 입력 디바운스(450ms) 후 변경 있을 때만 saveMemo 호출. */
function scheduleSave() {
  const id = memoStore.selectedMemoId
  if (!id) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    if (isDraftUnchanged()) return
    void memoStore.saveMemo(id, {
      title: titleFromMemoBody(draftBody.value),
      body: draftBody.value,
    })
  }, 450)
}

/** 타이머 취소 후 즉시 저장(블러·전환·닫기 등). */
function flushSave() {
  const id = memoStore.selectedMemoId
  if (!id) return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (isDraftUnchanged()) return
  void memoStore.saveMemo(id, {
    title: titleFromMemoBody(draftBody.value),
    body: draftBody.value,
  })
}

/** 빈 메모 추가 전 기존 편집분 저장. */
async function onNewMemo() {
  flushSave()
  await memoStore.addMemo({ title: '', body: '' })
}

/** 삭제 전 저장 후 removeMemo. */
async function onDeleteMemo() {
  const id = memoStore.selectedMemoId
  if (!id) return
  flushSave()
  await memoStore.removeMemo(id)
}

/** 마운트 시 메모 목록 로드 및 리사이즈 리스너 등록. */
onMounted(() => {
  void memoStore.fetchMemos()
  window.addEventListener('resize', onWindowResize)
})

/** 리스너·body 스크롤·진행 중 드래그 정리. */
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  document.removeEventListener('keydown', onExpandedEscape)
  document.body.style.overflow = ''
  if (gripUp) gripUp()
})
</script>

<style lang="scss" scoped>
@use '@/styles/index.scss' as *;

.memo-panel {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  min-height: 0;
  margin-top: $spacing-md;
  padding-top: $spacing-md;
  border-top: 1px solid $color-gray-200;
}

.memo-panel__heading {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: $color-gray-800;
}

.memo-panel__layout {
  display: grid;
  grid-template-columns: minmax(120px, 38%) 1fr;
  gap: $spacing-sm;
  min-height: 220px;
  max-height: 360px;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
  background: $color-white;
  overflow: hidden;
}

.memo-panel__sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid $color-gray-200;
  background: $color-gray-50;
}

.memo-panel__new-btn {
  flex-shrink: 0;
  margin: $spacing-sm;
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-primary;
  border-radius: $radius-md;
  background: rgba($color-primary-light, 0.12);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-primary-dark;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba($color-primary-light, 0.22);
  }
}

.memo-panel__sidebar-loading {
  padding: $spacing-sm;
  font-size: 0.75rem;
  color: $color-gray-500;
}

.memo-panel__list {
  margin: 0;
  padding: 0 0 $spacing-sm;
  list-style: none;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  position: relative;
  >li{
    position: relative;
    &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, #d1d5db 30%, #d1d5db 70%, transparent);
    }
  }
}

.memo-panel__list-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: $spacing-xs $spacing-sm;
  border: none;
  border-left: 3px solid transparent;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: $color-gray-800;
  transition: background 0.12s, border-color 0.12s;

  &:hover {
    background: rgba($color-primary-light, 0.08);
  }

  &--active {
    background: rgba($color-primary-light, 0.15);
    border-left-color: $color-primary;
    font-weight: 600;
  }
  
}

.memo-panel__list-title {
  font-size: 0.75rem;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.memo-panel__list-meta {
  font-size: 0.625rem;
  color: $color-gray-500;
}

.memo-panel__editor-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: $spacing-sm;
  gap: $spacing-xs;
}

.memo-panel__editor-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: $spacing-xs;
}

.memo-panel__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xs;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  color: $color-gray-700;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
    background: rgba($color-primary-light, 0.1);
  }
}

.memo-panel__icon-svg {
  width: 16px;
  height: 16px;
}

.memo-panel__delete-btn {
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 600;
  color: $color-gray-700;
  cursor: pointer;

  &:hover {
    border-color: #ef4444;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.06);
  }
}

.memo-panel__body-input {
  flex: 1;
  min-height: 140px;
  width: 100%;
  padding: $spacing-sm;
  border: 1px solid $color-gray-200;
  border-radius: $radius-md;
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: $color-gray-800;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: $color-primary;
  }
}

.memo-panel__placeholder {
  margin: auto;
  padding: $spacing-lg;
  font-size: 0.8125rem;
  color: $color-gray-500;
  text-align: center;
}

@media (max-width: 480px) {
  .memo-panel__layout {
    grid-template-columns: 1fr;
    max-height: none;
  }

  .memo-panel__sidebar {
    border-right: none;
    border-bottom: 1px solid $color-gray-200;
    max-height: 160px;
  }
}

/* 확대 레이어 (Teleport → body, 스코프 방지용 :deep 미사용 — 클래스 prefix만 최소화) */
.memo-expand-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.45);
}

.memo-expand-shell {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  box-sizing: border-box;
  border-radius: $radius-lg;
  box-shadow: $shadow-md, 0 25px 50px rgba(0, 0, 0, 0.18);
  background: $color-white;
  outline: none;
}

.memo-expand__corner {
  position: absolute;
  z-index: 3;
  width: 14px;
  height: 14px;
  touch-action: none;

  &:hover {
    background: rgba($color-primary, 0.18);
  }

  &--nw {
    top: 0;
    left: 0;
    cursor: nwse-resize;
    border-radius: $radius-lg 0 0 0;
  }

  &--ne {
    top: 0;
    right: 0;
    cursor: nesw-resize;
    border-radius: 0 $radius-lg 0 0;
  }

  &--sw {
    bottom: 0;
    left: 0;
    cursor: nesw-resize;
    border-radius: 0 0 0 $radius-lg;
  }

  &--se {
    bottom: 0;
    right: 0;
    cursor: nwse-resize;
    border-radius: 0 0 $radius-lg 0;
  }
}

.memo-expand__grip {
  flex-shrink: 0;
  width: 10px;
  cursor: ew-resize;
  background: transparent;
  align-self: stretch;
  touch-action: none;

  &:hover {
    background: rgba($color-primary, 0.12);
  }

  &--left {
    border-radius: $radius-lg 0 0 $radius-lg;
  }

  &--right {
    border-radius: 0 $radius-lg $radius-lg 0;
  }
}

.memo-expand__inner {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  overflow: hidden;
}

.memo-expand__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
}

.memo-expand__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: $color-gray-900;
}

.memo-expand__close {
  display: inline-flex;
  padding: $spacing-xs;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  color: $color-gray-600;
  cursor: pointer;

  &:hover {
    background: $color-gray-100;
    color: $color-gray-900;
  }
}

.memo-expand__close-svg {
  width: 20px;
  height: 20px;
}

.memo-expand__body-input {
  flex: 1;
  min-height: 120px;
  width: 100%;
  padding: $spacing-md;
  border: 1px solid $color-gray-200;
  border-radius: $radius-md;
  font: inherit;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: $color-gray-800;
  resize: none;

  &:focus {
    outline: none;
    border-color: $color-primary;
  }
}
</style>

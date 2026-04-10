<template>
  <section class="memo-panel" aria-label="메모">
    <h3 class="memo-panel__heading">메모</h3>
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
            <button type="button" class="memo-panel__delete-btn" @click="onDeleteMemo">
              삭제
            </button>
          </div>
          <input
            v-model="draftTitle"
            type="text"
            class="memo-panel__title-input"
            placeholder="제목"
            autocomplete="off"
            @input="scheduleSave"
            @blur="flushSave"
          />
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
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMemoStore } from '@/stores/memo-store'
import type { Memo } from '@/types/memo'

const memoStore = useMemoStore()
const { selectedMemo } = storeToRefs(memoStore)

const draftTitle = ref('')
const draftBody = ref('')

let saveTimer: ReturnType<typeof setTimeout> | null = null

watch(
  selectedMemo,
  (m) => {
    draftTitle.value = m?.title ?? ''
    draftBody.value = m?.body ?? ''
  },
  { immediate: true }
)

function listTitle(m: Memo): string {
  const t = m.title?.trim()
  if (t) return t
  const first = m.body?.trim().split(/\r?\n/).find((line) => line.length > 0)
  if (first) return first.length > 48 ? `${first.slice(0, 48)}…` : first
  return '제목 없음'
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return ''
  }
}

function selectMemoRow(id: string) {
  flushSave()
  memoStore.selectMemo(id)
}

function scheduleSave() {
  const id = memoStore.selectedMemoId
  if (!id) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void memoStore.saveMemo(id, { title: draftTitle.value, body: draftBody.value })
  }, 450)
}

function flushSave() {
  const id = memoStore.selectedMemoId
  if (!id) return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  void memoStore.saveMemo(id, { title: draftTitle.value, body: draftBody.value })
}

async function onNewMemo() {
  flushSave()
  await memoStore.addMemo({ title: '', body: '' })
}

async function onDeleteMemo() {
  const id = memoStore.selectedMemoId
  if (!id) return
  flushSave()
  await memoStore.removeMemo(id)
}

onMounted(() => {
  void memoStore.fetchMemos()
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
  font-size: 0.8125rem;
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

.memo-panel__title-input {
  width: 100%;
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-gray-200;
  border-radius: $radius-md;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-900;

  &:focus {
    outline: none;
    border-color: $color-primary;
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
</style>

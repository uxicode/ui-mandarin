<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__title">Mandarin Priority</h1>
      <p class="app__subtitle">감정이 아닌 수치로 업무 우선순위를 시각화</p>
    </header>

    <main class="app__main">
      <div class="app__sidebar">
        <TaskList
          :selected-task-id="selectedTaskId"
          @select="handleSelect"
          @delete="handleDelete"
        />
      </div>

      <div class="app__content">
        <PriorityMatrix :selected-task-id="selectedTaskId" @select="handleSelect" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import TaskList from '@/components/TaskList.vue'
import PriorityMatrix from '@/components/PriorityMatrix.vue'

const taskStore = useTaskStore()

const selectedTaskId = ref<string | undefined>()

onMounted(async () => {
  try {
    await taskStore.fetchTasks()
  } catch (error) {
    console.error('업무 목록 불러오기 실패:', error)
  }
})

// 업무 선택
function handleSelect(taskId: string) {
  selectedTaskId.value = taskId
}

// 업무 삭제
async function handleDelete(taskId: string) {
  try {
    await taskStore.deleteTask(taskId)
    if (selectedTaskId.value === taskId) {
      selectedTaskId.value = undefined
    }
  } catch (error) {
    console.error('업무 삭제 실패:', error)
  }
}
</script>

<style lang="scss">
@use '@/styles/reset.scss';
@use '@/styles/index.scss' as *;

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app__header {
  padding: $spacing-lg $spacing-xl;
  background: $color-white;
  border-bottom: 1px solid $color-gray-200;
  box-shadow: $shadow-sm;
}

.app__title {
  font-size: 2rem;
  font-weight: 700;
  color: $color-gray-900;
  margin-bottom: $spacing-xs;
}

.app__subtitle {
  font-size: 0.875rem;
  color: $color-gray-600;
}

.app__main {
  flex: 1;
  display: flex;
  gap: $spacing-xl;
  padding: $spacing-xl;
  overflow: hidden;

  @include mobile {
    flex-direction: column;
    padding: $spacing-md;
    gap: $spacing-md;
  }
}

.app__sidebar {
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  overflow-y: auto;

  @include mobile {
    width: 100%;
    max-height: 50vh;
  }
}

.app__content {
  flex: 1;
  min-height: 0;

  @include mobile {
    min-height: 50vh;
  }
}
</style>


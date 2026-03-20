<template>
  <div class="home-view">
    <main class="app__main">
      <div class="app__sidebar">
        <TaskList
          :selected-task-id="selectedTaskId"
          @select="handleSelect"
          @delete="handleDelete"
        />
      </div>

      <div class="app__content">
        <PriorityMatrix
          :selected-task-id="selectedTaskId"
          @select="handleSelect"
          @clear-selection="selectedTaskId = undefined"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import TaskList from '@/components/TaskList.vue'
import PriorityMatrix from '@/components/PriorityMatrix.vue'

const taskStore = useTaskStore()

const selectedTaskId = ref<string | undefined>()

function handleSelect(taskId: string) {
  selectedTaskId.value = taskId
}

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

defineExpose({ selectedTaskId })
</script>

<style lang="scss" scoped>
@use '@/styles/index.scss' as *;

.home-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.app__main {
  flex: 1;
  display: flex;
  gap: $spacing-xl;
  padding: $spacing-xl;
  overflow: hidden;
  min-height: 0;

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

<template>
  <div class="home-view">
    <main class="app__main">
      <aside class="app__col app__col--planning">
        <TaskPlanningPanel @select="handleSelect" />
      </aside>

      <section class="app__col app__col--tasks">
        <TaskList
          :selected-task-id="selectedTaskId"
          @select="handleSelect"
          @delete="handleDelete"
        />
      </section>

      <section class="app__col app__col--matrix">
        <PriorityMatrix
          :selected-task-id="selectedTaskId"
          @select="handleSelect"
          @clear-selection="selectedTaskId = undefined"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import TaskPlanningPanel from '@/components/TaskPlanningPanel.vue'
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
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(300px, 1.2fr) minmax(0, 2.4fr);
  gap: $spacing-xl;
  padding: $spacing-xl;
  overflow: hidden;
  min-height: 0;

  @include mobile {
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(0, auto);
    padding: $spacing-md;
    gap: $spacing-md;
    overflow: auto;
  }
}

.app__col {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;

  &--planning {
    @include mobile {
      max-height: none;
    }
  }

  &--tasks {
    min-width: 0;
  }

  &--matrix {
    min-width: 0;
  }
}
</style>

<template>
  <div class="home-view">
    <main class="app__main" :class="{ 'app__main--timeline': showTimeline }">
      <aside class="app__col app__col--planning">
        <TaskPlanningPanel @select="handleSelect" />
      </aside>

      <section class="app__col app__col--tasks">
        <TaskList
          :selected-task-id="selectedTaskId"
          :show-timeline="showTimeline"
          @select="handleSelect"
          @delete="handleDelete"
          @toggle-timeline="handleToggleTimeline"
        />
      </section>

      <Transition name="matrix-exit">
        <section v-if="!showTimeline" class="app__col app__col--matrix">
          <PriorityMatrix
            :selected-task-id="selectedTaskId"
            @select="handleSelect"
            @clear-selection="selectedTaskId = undefined"
          />
        </section>
      </Transition>
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
const showTimeline = ref(false)

function handleSelect(taskId: string) {
  selectedTaskId.value = taskId
}

function handleToggleTimeline() {
  showTimeline.value = !showTimeline.value
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
  grid-template-columns: minmax(200px, 1fr) minmax(300px, 1fr) minmax(0, 2fr);
  gap: $spacing-xl;
  padding: $spacing-xl;
  overflow: hidden;
  min-height: 0;
  position: relative; // matrix leave animation 기준점

  &--timeline {
    // planning 은 원래 비율(1fr) 유지, tasks 가 matrix 공간(1.2fr + 2.4fr = 3.6fr) 흡수
    grid-template-columns: minmax(200px, 1fr) minmax(300px, 3.6fr);
  }

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
  // overflow: auto;

  &--planning {
    @include mobile {
      max-height: none;
    }
  }

  &--tasks {
    min-width: 0;
    overflow: visible;
  }

  &--matrix {
    min-width: 0;
  }
}

// PriorityMatrix slide-out (우측으로 퇴장)
.matrix-exit-leave-active {
  position: absolute;
  right: $spacing-xl;
  top: $spacing-xl;
  bottom: $spacing-xl;
  width: minmax(0, 2.4fr);
  transition:
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.28s;
  pointer-events: none;
  overflow: hidden;
}
.matrix-exit-leave-to {
  transform: translateX(calc(100% + #{$spacing-xl}));
  opacity: 0;
}

// PriorityMatrix 복귀 (우측에서 진입)
.matrix-exit-enter-active {
  transition:
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.28s;
}
.matrix-exit-enter-from {
  transform: translateX(60px);
  opacity: 0;
}
</style>

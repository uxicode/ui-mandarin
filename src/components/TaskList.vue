<template>
  <div class="task-list">
    <div class="task-list__timeline-wrap">
      <TaskDayCalendar
        :selected-task-id="props.selectedTaskId"
        @select="emit('select', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import { useCalendarUiStore } from '@/stores/calendar-ui-store'
import TaskDayCalendar from './TaskDayCalendar.vue'

interface Props {
  selectedTaskId?: string
}

interface Emits {
  (e: 'select', taskId: string): void
  (e: 'delete', taskId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const calendarStore = useCalendarUiStore()

watch(
  () => props.selectedTaskId,
  (taskId) => {
    if (!taskId) return
    const task = taskStore.tasks.find((t) => t.id === taskId)
    if (!task) return
    calendarStore.applyForTask(task)
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.task-list {
  height: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.task-list__timeline-wrap {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useTaskStore } from '@/stores/task-store'
import { useCalendarUiStore } from '@/stores/calendar-ui-store'
import TaskList from '@/components/TaskList.vue'

describe('TaskList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCalendarUiStore().selectedCalendarDay = null
  })

  it('should render TaskDayCalendar inside timeline wrap', () => {
    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          TaskDayCalendar: { template: '<div class="task-day-cal-stub" />' },
        },
      },
    })

    expect(wrapper.find('.task-list__timeline-wrap').exists()).toBe(true)
    expect(wrapper.find('.task-day-cal-stub').exists()).toBe(true)
  })

  it('should not render legacy header controls', () => {
    const wrapper = mount(TaskList, {
      global: {
        stubs: { TaskDayCalendar: true },
      },
    })

    expect(wrapper.find('.task-list__header').exists()).toBe(false)
    expect(wrapper.find('.task-list__add-button').exists()).toBe(false)
  })

  it('should keep tasks out of DOM as plain list rows', async () => {
    const store = useTaskStore()
    await store.addTask({
      title: 'Cal only',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })

    const wrapper = mount(TaskList, {
      global: {
        stubs: { TaskDayCalendar: true },
      },
    })

    await flushPromises()

    expect(wrapper.find('.task-item').exists()).toBe(false)
  })

  it('should sync calendar when selectedTaskId is set', async () => {
    const store = useTaskStore()
    await store.addTask({
      title: 'Synced',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })
    const id = store.tasks[0].id

    const wrapper = mount(TaskList, {
      props: { selectedTaskId: id },
      global: {
        stubs: { TaskDayCalendar: true },
      },
    })

    await flushPromises()

    expect(useCalendarUiStore().selectedCalendarDay).not.toBeNull()
    await wrapper.unmount()
  })
})

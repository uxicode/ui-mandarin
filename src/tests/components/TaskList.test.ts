import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useTaskStore } from '@/stores/task-store'
import { useCalendarUiStore } from '@/stores/calendar-ui-store'
import TaskList from '@/components/TaskList.vue'
import { TASK_LIST_DAY_SECTION_TITLE } from '@/constants/task-list-ui'

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

  it('should render default section title from shared constant', () => {
    const wrapper = mount(TaskList, {
      global: {
        stubs: { TaskDayCalendar: true },
      },
    })

    expect(wrapper.find('.task-list__section-title').text()).toBe(TASK_LIST_DAY_SECTION_TITLE)
  })

  it('should allow overriding section title via prop', () => {
    const wrapper = mount(TaskList, {
      props: { sectionTitle: '내 일정' },
      global: {
        stubs: { TaskDayCalendar: true },
      },
    })

    expect(wrapper.find('.task-list__section-title').text()).toBe('내 일정')
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

  it('opens title popup from toolbar button', async () => {
    const wrapper = mount(TaskList, {
      global: {
        stubs: { TaskDayCalendar: true },
      },
    })

    expect(wrapper.find('.task-list__title-popup-root').exists()).toBe(false)
    await wrapper.get('.task-list__title-popup-open').trigger('click')
    await flushPromises()
    expect(wrapper.find('.task-list__title-popup-panel').exists()).toBe(true)

    await wrapper.get('.task-list__title-popup-close').trigger('click')
    await flushPromises()
    expect(wrapper.find('.task-list__title-popup-root').exists()).toBe(false)

    await wrapper.unmount()
  })

  it('shows task titles for selected calendar day in popup', async () => {
    const store = useTaskStore()
    const cal = useCalendarUiStore()
    const dk = '2026-06-15'
    cal.selectedCalendarDay = dk

    const { localDayMinutesToIso } = await import('@/utils/day-calendar')
    await store.addTask({
      title: 'Popup Title Alpha',
      scores: { importance: 3, urgency: 3 },
      completed: false,
      startDate: localDayMinutesToIso(dk, 9 * 60),
      deadline: localDayMinutesToIso(dk, 10 * 60),
    })

    const wrapper = mount(TaskList, {
      global: {
        stubs: { TaskDayCalendar: true },
      },
    })

    await flushPromises()
    await wrapper.get('.task-list__title-popup-open').trigger('click')
    await flushPromises()

    expect(wrapper.find('.task-list__title-popup-panel').text()).toContain('Popup Title Alpha')

    await wrapper.unmount()
  })
})

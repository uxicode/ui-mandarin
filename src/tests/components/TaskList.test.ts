import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useTaskStore } from '@/stores/task-store'
import TaskList from '@/components/TaskList.vue'

// Mock components
vi.mock('@vuepic/vue-datepicker', () => ({
  VueDatePicker: {
    name: 'VueDatePicker',
    template: '<input />',
    props: ['modelValue'],
  },
}))

describe('TaskList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render header with title and add button', () => {
    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    expect(wrapper.find('.task-list__title').text()).toBe('업무 목록')
    expect(wrapper.find('.task-list__add-button').exists()).toBe(true)
  })

  it('should show empty message when no tasks', () => {
    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    expect(wrapper.find('.task-list__empty').exists()).toBe(true)
    expect(wrapper.find('.task-list__empty').text()).toContain('업무가 없습니다')
  })

  it('should display incomplete tasks', async () => {
    const store = useTaskStore()
    store.addTask({
      title: 'Incomplete Task',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })

    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Incomplete Task')
    expect(wrapper.text()).toContain('진행 중')
  })

  it('should display completed tasks in separate section', async () => {
    const store = useTaskStore()
    
    store.addTask({
      title: 'Incomplete Task',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })

    store.addTask({
      title: 'Will be completed',
      scores: { importance: 4, urgency: 4 },
      completed: false,
    })

    // Complete the second task
    const taskId = store.tasks[1].id
    store.updateTask(taskId, { completed: true })

    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('진행 중 (1)')
    expect(wrapper.text()).toContain('완료 (1)')
    expect(wrapper.text()).toContain('Incomplete Task')
    expect(wrapper.text()).toContain('Will be completed')
  })

  it('should emit select event when task is clicked', async () => {
    const store = useTaskStore()
    store.addTask({
      title: 'Test Task',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })

    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    await flushPromises()

    const taskContent = wrapper.find('.task-item__content')
    await taskContent.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('should toggle task completion when checkbox is clicked', async () => {
    const store = useTaskStore()
    store.addTask({
      title: 'Test Task',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })

    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    await flushPromises()

    const checkbox = wrapper.find('.task-item__checkbox')
    await checkbox.trigger('change')

    await flushPromises()

    expect(store.tasks[0].completed).toBe(true)
  })

  it('should show edit form when edit button is clicked', async () => {
    const store = useTaskStore()
    store.addTask({
      title: 'Test Task',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })

    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    await flushPromises()

    const editButton = wrapper.find('.task-item__button--edit')
    await editButton.trigger('click')

    await flushPromises()

    expect(wrapper.find('.task-item__edit').exists()).toBe(true)
  })

  it('should show add form when add button is clicked', async () => {
    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    const addButton = wrapper.find('.task-list__add-button')
    await addButton.trigger('click')

    await flushPromises()

    // TaskForm should be visible after clicking add button
    const taskForm = wrapper.findComponent({ name: 'TaskForm' })
    expect(taskForm.exists()).toBe(true)
  })

  it('should display task with dates', async () => {
    const store = useTaskStore()
    store.addTask({
      title: 'Task with dates',
      scores: { importance: 3, urgency: 3 },
      completed: false,
      startDate: '2026-01-01T00:00:00',
      deadline: '2026-01-15T00:00:00',
    })

    const wrapper = mount(TaskList, {
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.find('.task-item__dates').exists()).toBe(true)
  })

  it('should highlight selected task', async () => {
    const store = useTaskStore()
    store.addTask({
      title: 'Test Task',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })

    const wrapper = mount(TaskList, {
      props: {
        selectedTaskId: store.tasks[0].id,
      },
      global: {
        stubs: {
          StarRating: true,
          TaskForm: true,
          VueDatePicker: true,
        },
      },
    })

    await flushPromises()

    const taskItem = wrapper.find('.task-item')
    expect(taskItem.classes()).toContain('task-item--selected')
  })
})

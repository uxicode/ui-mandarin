import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useTaskStore } from '@/stores/task-store'
import App from '@/App.vue'

// Mock components
vi.mock('@vuepic/vue-datepicker', () => ({
  VueDatePicker: {
    name: 'VueDatePicker',
    template: '<input />',
    props: ['modelValue'],
  },
}))

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render header with title and subtitle', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          TaskList: true,
          PriorityMatrix: true,
          TaskForm: true,
          StarRating: true,
          VueDatePicker: true,
        },
      },
    })

    expect(wrapper.find('.app__title').text()).toBe('Mandarin Priority')
    expect(wrapper.find('.app__subtitle').text()).toContain('감정이 아닌 수치로')
  })

  it('should render TaskList component', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          TaskList: true,
          PriorityMatrix: true,
          TaskForm: true,
          StarRating: true,
          VueDatePicker: true,
        },
      },
    })

    expect(wrapper.findComponent({ name: 'TaskList' }).exists()).toBe(true)
  })

  it('should render PriorityMatrix component', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          TaskList: true,
          PriorityMatrix: true,
          TaskForm: true,
          StarRating: true,
          VueDatePicker: true,
        },
      },
    })

    expect(wrapper.findComponent({ name: 'PriorityMatrix' }).exists()).toBe(true)
  })

  it('should have sidebar and content sections', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          TaskList: true,
          PriorityMatrix: true,
          TaskForm: true,
          StarRating: true,
          VueDatePicker: true,
        },
      },
    })

    expect(wrapper.find('.app__sidebar').exists()).toBe(true)
    expect(wrapper.find('.app__content').exists()).toBe(true)
  })

  it('should pass selected task ID to components', async () => {
    const store = useTaskStore()
    store.addTask({
      title: 'Test Task',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })

    const wrapper = mount(App, {
      global: {
        stubs: {
          TaskList: true,
          PriorityMatrix: true,
          TaskForm: true,
          StarRating: true,
          VueDatePicker: true,
        },
      },
    })

    await flushPromises()

    const taskList = wrapper.findComponent({ name: 'TaskList' })
    const matrix = wrapper.findComponent({ name: 'PriorityMatrix' })

    taskList.vm.$emit('select', store.tasks[0].id)
    await flushPromises()

    expect(wrapper.vm.selectedTaskId).toBe(store.tasks[0].id)
  })

  it('should handle task deletion', async () => {
    const store = useTaskStore()
    store.addTask({
      title: 'Test Task',
      scores: { importance: 3, urgency: 3 },
      completed: false,
    })

    const taskId = store.tasks[0].id

    const wrapper = mount(App, {
      global: {
        stubs: {
          TaskList: true,
          PriorityMatrix: true,
          TaskForm: true,
          StarRating: true,
          VueDatePicker: true,
        },
      },
    })

    await flushPromises()

    // Select the task first
    const taskList = wrapper.findComponent({ name: 'TaskList' })
    taskList.vm.$emit('select', taskId)
    await flushPromises()

    expect(wrapper.vm.selectedTaskId).toBe(taskId)

    // Delete the task
    taskList.vm.$emit('delete', taskId)
    await flushPromises()

    expect(store.tasks.length).toBe(0)
    expect(wrapper.vm.selectedTaskId).toBeUndefined()
  })

  it('should have proper layout structure', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          TaskList: true,
          PriorityMatrix: true,
          TaskForm: true,
          StarRating: true,
          VueDatePicker: true,
        },
      },
    })

    const main = wrapper.find('.app__main')
    expect(main.exists()).toBe(true)
    
    const sidebar = main.find('.app__sidebar')
    const content = main.find('.app__content')
    
    expect(sidebar.exists()).toBe(true)
    expect(content.exists()).toBe(true)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TaskForm from '@/components/TaskForm.vue'

// Mock VueDatePicker
vi.mock('@vuepic/vue-datepicker', () => ({
  VueDatePicker: {
    name: 'VueDatePicker',
    template: '<input />',
    props: ['modelValue'],
  },
}))

describe('TaskForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render form with all fields', () => {
    const wrapper = mount(TaskForm)

    expect(wrapper.find('.task-form__title').text()).toBe('새 업무 추가')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should show "업무 수정" when editing', async () => {
    const wrapper = mount(TaskForm, {
      props: {
        task: {
          id: '1',
          title: 'Test Task',
          scores: {
            importance: 3,
            urgency: 3,
          },
          completed: false,
        },
      },
    })

    expect(wrapper.find('.task-form__title').text()).toBe('업무 수정')
  })

  it('should populate form fields when task prop is provided', async () => {
    const wrapper = mount(TaskForm, {
      props: {
        task: {
          id: '1',
          title: 'Test Task',
          description: 'Test Description',
          scores: {
            importance: 4,
            urgency: 5,
          },
          completed: false,
        },
      },
    })

    const titleInput = wrapper.find('input[type="text"]')
    const descriptionTextarea = wrapper.find('textarea')

    expect((titleInput.element as HTMLInputElement).value).toBe('Test Task')
    expect((descriptionTextarea.element as HTMLTextAreaElement).value).toBe('Test Description')
  })

  it('should emit submit event with form data', async () => {
    const wrapper = mount(TaskForm)

    await wrapper.find('input[type="text"]').setValue('New Task')
    await wrapper.find('textarea').setValue('New Description')
    
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeTruthy()
    const emittedData = wrapper.emitted('submit')?.[0][0] as any
    expect(emittedData.title).toBe('New Task')
    expect(emittedData.description).toBe('New Description')
    expect(emittedData.completed).toBe(false)
  })

  it('should emit cancel event when cancel button is clicked', async () => {
    const wrapper = mount(TaskForm)

    await wrapper.find('.task-form__button--cancel').trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('should require title field', async () => {
    const wrapper = mount(TaskForm)

    const titleInput = wrapper.find('input[type="text"]')
    expect(titleInput.attributes('required')).toBeDefined()
  })

  it('should have correct button text for new task', () => {
    const wrapper = mount(TaskForm)

    const submitButton = wrapper.find('.task-form__button--submit')
    expect(submitButton.text()).toBe('추가')
  })

  it('should have correct button text for editing task', () => {
    const wrapper = mount(TaskForm, {
      props: {
        task: {
          id: '1',
          title: 'Test Task',
          scores: {
            importance: 3,
            urgency: 3,
          },
          completed: false,
        },
      },
    })

    const submitButton = wrapper.find('.task-form__button--submit')
    expect(submitButton.text()).toBe('수정')
  })

  it('should reset form when task prop changes to undefined', async () => {
    const wrapper = mount(TaskForm, {
      props: {
        task: {
          id: '1',
          title: 'Test Task',
          description: 'Test Description',
          scores: {
            importance: 4,
            urgency: 5,
          },
          completed: false,
        },
      },
    })

    await wrapper.setProps({ task: undefined })

    const titleInput = wrapper.find('input[type="text"]')
    const descriptionTextarea = wrapper.find('textarea')

    expect((titleInput.element as HTMLInputElement).value).toBe('')
    expect((descriptionTextarea.element as HTMLTextAreaElement).value).toBe('')
  })
})

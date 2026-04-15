import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import QuickTaskModal from '@/components/QuickTaskModal.vue'

describe('QuickTaskModal', () => {
  it('create mode emits title and default scores on submit', async () => {
    const wrapper = mount(QuickTaskModal, {
      props: {
        open: true,
        mode: 'create',
        slotLabel: '10:00',
        initialTitle: '',
      },
      global: {
        stubs: { StarRating: true },
      },
    })

    await wrapper.find('.quick-task-modal__input').setValue('Hello')
    await wrapper.find('.quick-task-modal__btn--primary').trigger('click')

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      { title: 'Hello', scores: { importance: 3, urgency: 3 } },
    ])
  })

  it('edit mode emits title and scores from initial values', async () => {
    const wrapper = mount(QuickTaskModal, {
      props: {
        open: true,
        mode: 'edit',
        initialTitle: 'Old',
        initialScores: { importance: 4, urgency: 2 },
      },
      global: {
        stubs: { StarRating: true },
      },
    })

    await wrapper.find('.quick-task-modal__input').setValue('Updated')
    await wrapper.find('.quick-task-modal__btn--primary').trigger('click')

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        title: 'Updated',
        scores: { importance: 4, urgency: 2 },
      },
    ])
  })
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FeedbackDonut from '@/components/FeedbackDonut.vue'

describe('FeedbackDonut', () => {
  it('draws a ring path when only one segment has count 1 (full circle SVG quirk)', () => {
    const wrapper = mount(FeedbackDonut, {
      props: {
        title: '일간',
        segments: [{ key: 'incomplete', label: '미완료', count: 1, color: '#f59e0b' }],
      },
    })
    const paths = wrapper.findAll('path')
    expect(paths.length).toBe(1)
    const d = paths[0]!.attributes('d') ?? ''
    expect(d.length).toBeGreaterThan(20)
    expect(d).toMatch(/^M /)
  })
})

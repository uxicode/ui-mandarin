import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StarRating from '@/components/StarRating.vue'

describe('StarRating', () => {
  it('should render component with label', () => {
    const wrapper = mount(StarRating, {
      props: {
        label: '중요도',
        value: 3,
      },
    })

    expect(wrapper.find('.star-rating__label').text()).toBe('중요도')
  })

  it('should render 5 stars', () => {
    const wrapper = mount(StarRating, {
      props: {
        label: '중요도',
        value: 3,
      },
    })

    const stars = wrapper.findAll('.star-rating__star')
    expect(stars.length).toBe(5)
  })

  it('should display correct number of active stars', () => {
    const wrapper = mount(StarRating, {
      props: {
        label: '중요도',
        value: 3,
      },
    })

    const activeStars = wrapper.findAll('.star-rating__star--active')
    expect(activeStars.length).toBe(3)
  })

  it('should display value text', () => {
    const wrapper = mount(StarRating, {
      props: {
        label: '중요도',
        value: 4,
      },
    })

    expect(wrapper.find('.star-rating__value').text()).toBe('4/5')
  })

  it('should emit update:value event when star is clicked', async () => {
    const wrapper = mount(StarRating, {
      props: {
        label: '중요도',
        value: 3,
      },
    })

    const fourthStar = wrapper.findAll('.star-rating__star')[3]
    await fourthStar.trigger('click')

    expect(wrapper.emitted('update:value')).toBeTruthy()
    expect(wrapper.emitted('update:value')?.[0]).toEqual([4])
  })

  it('should update active stars when value prop changes', async () => {
    const wrapper = mount(StarRating, {
      props: {
        label: '중요도',
        value: 2,
      },
    })

    expect(wrapper.findAll('.star-rating__star--active').length).toBe(2)

    await wrapper.setProps({ value: 5 })
    expect(wrapper.findAll('.star-rating__star--active').length).toBe(5)
  })

  it('should emit different values for different star clicks', async () => {
    const wrapper = mount(StarRating, {
      props: {
        label: '중요도',
        value: 3,
      },
    })

    const stars = wrapper.findAll('.star-rating__star')

    await stars[0].trigger('click')
    expect(wrapper.emitted('update:value')?.[0]).toEqual([1])

    await stars[4].trigger('click')
    expect(wrapper.emitted('update:value')?.[1]).toEqual([5])
  })
})

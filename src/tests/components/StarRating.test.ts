import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StarRating from '@/components/StarRating.vue'

function mockStarsRect(el: Element) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    width: 125,
    left: 0,
    top: 0,
    right: 125,
    bottom: 24,
    height: 24,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('StarRating', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('should display value for whole stars', () => {
    const wrapper = mount(StarRating, {
      props: {
        label: '중요도',
        value: 3,
      },
    })

    expect(wrapper.find('.star-rating__value').text()).toBe('3/5')
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
      attachTo: document.body,
      props: {
        label: '중요도',
        value: 3,
      },
    })

    const track = wrapper.find('.star-rating__stars').element
    mockStarsRect(track)

    await wrapper.find('.star-rating__stars').trigger('mousedown', { clientX: 87.5 })
    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(wrapper.emitted('update:value')).toBeTruthy()
    expect(wrapper.emitted('update:value')?.[0]).toEqual([4])

    wrapper.unmount()
  })

  it('should update displayed value when value prop changes', async () => {
    const wrapper = mount(StarRating, {
      props: {
        label: '중요도',
        value: 2,
      },
    })

    expect(wrapper.find('.star-rating__value').text()).toBe('2/5')

    await wrapper.setProps({ value: 5 })
    expect(wrapper.find('.star-rating__value').text()).toBe('5/5')
  })

  it('should emit different values for different star clicks', async () => {
    const wrapper = mount(StarRating, {
      attachTo: document.body,
      props: {
        label: '중요도',
        value: 3,
      },
    })

    const track = wrapper.find('.star-rating__stars').element
    mockStarsRect(track)

    await wrapper.find('.star-rating__stars').trigger('mousedown', { clientX: 12.5 })
    window.dispatchEvent(new MouseEvent('mouseup'))
    expect(wrapper.emitted('update:value')?.[0]).toEqual([1])

    await wrapper.find('.star-rating__stars').trigger('mousedown', { clientX: 112.5 })
    window.dispatchEvent(new MouseEvent('mouseup'))
    expect(wrapper.emitted('update:value')?.[1]).toEqual([5])

    wrapper.unmount()
  })
})

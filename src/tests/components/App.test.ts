import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, getActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useTaskStore } from '@/stores/task-store'
import { useAuthStore } from '@/stores/auth-store'
import App from '@/App.vue'
import HomeView from '@/views/HomeView.vue'

vi.mock('@vuepic/vue-datepicker', () => ({
  VueDatePicker: {
    name: 'VueDatePicker',
    template: '<input />',
    props: ['modelValue'],
  },
}))

function mockFetchForAuth() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/auth/me')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, user: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }
      return Promise.reject(new Error(`Unmocked fetch: ${url}`))
    })
  )
}

function createRouterInstance() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/login', name: 'login', component: { template: '<div>login</div>' } },
      { path: '/signup', name: 'signup', component: { template: '<div>signup</div>' } },
      { path: '/profile', name: 'profile', component: { template: '<div>profile</div>' } },
    ],
  })
}

async function mountApp() {
  const pinia = getActivePinia()
  if (!pinia) throw new Error('Pinia not active')
  const router = createRouterInstance()
  await router.push('/')
  await router.isReady()
  return mount(App, {
    global: {
      plugins: [pinia, router],
      stubs: {
        TaskList: true,
        PriorityMatrix: true,
        TaskForm: true,
        StarRating: true,
        VueDatePicker: true,
      },
    },
  })
}

describe('App', () => {
  beforeEach(() => {
    mockFetchForAuth()
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.user = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should render header with title and subtitle', async () => {
    const wrapper = await mountApp()

    expect(wrapper.find('.app__title').text()).toBe('Mandarin Priority')
    expect(wrapper.find('.app__subtitle').text()).toContain('감정이 아닌 수치로')
  })

  it('should render TaskList inside home route', async () => {
    const wrapper = await mountApp()

    expect(wrapper.findComponent({ name: 'TaskList' }).exists()).toBe(true)
  })

  it('should render PriorityMatrix inside home route', async () => {
    const wrapper = await mountApp()

    expect(wrapper.findComponent({ name: 'PriorityMatrix' }).exists()).toBe(true)
  })

  it('should have sidebar and content sections on home', async () => {
    const wrapper = await mountApp()

    expect(wrapper.find('.app__sidebar').exists()).toBe(true)
    expect(wrapper.find('.app__content').exists()).toBe(true)
  })

  it('should pass selected task ID to components', async () => {
    const store = useTaskStore()
    await store.addTask({
      title: 'Test Task',
      scores: { importance: 3, urgency: 3 },
    })

    const wrapper = await mountApp()
    await flushPromises()

    const home = wrapper.findComponent(HomeView)
    const taskList = wrapper.findComponent({ name: 'TaskList' })

    taskList.vm.$emit('select', store.tasks[0].id)
    await flushPromises()

    expect(home.vm.selectedTaskId).toBe(store.tasks[0].id)
  })

  it('should handle task deletion', async () => {
    const store = useTaskStore()
    await store.addTask({
      title: 'Test Task',
      scores: { importance: 3, urgency: 3 },
    })

    const taskId = store.tasks[0].id

    const wrapper = await mountApp()
    await flushPromises()

    const home = wrapper.findComponent(HomeView)
    const taskList = wrapper.findComponent({ name: 'TaskList' })

    taskList.vm.$emit('select', taskId)
    await flushPromises()

    expect(home.vm.selectedTaskId).toBe(taskId)

    taskList.vm.$emit('delete', taskId)
    await flushPromises()

    expect(store.tasks.length).toBe(0)
    expect(home.vm.selectedTaskId).toBeUndefined()
  })

  it('should have proper layout structure on home', async () => {
    const wrapper = await mountApp()

    const main = wrapper.find('.app__main')
    expect(main.exists()).toBe(true)

    const sidebar = main.find('.app__sidebar')
    const content = main.find('.app__content')

    expect(sidebar.exists()).toBe(true)
    expect(content.exists()).toBe(true)
  })
})

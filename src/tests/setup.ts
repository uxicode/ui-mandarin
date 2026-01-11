import { beforeAll, afterEach, vi } from 'vitest'
import { config } from '@vue/test-utils'

// Mock window.matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

// Mock window.crypto.randomUUID
beforeAll(() => {
  if (!window.crypto) {
    // @ts-ignore
    window.crypto = {}
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }
  }
})

// Global test setup
config.global.stubs = {
  teleport: true,
}

afterEach(() => {
  vi.clearAllMocks()
})

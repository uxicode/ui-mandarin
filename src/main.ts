import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth-store'
import './styles/reset.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const authStore = useAuthStore()

app.use(router)

;(async () => {
  await authStore.initAuth()
  app.mount('#app')
})()

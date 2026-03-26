import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'

import Login from './components/Login.vue'
import TrainerDashboard from './components/TrainerDashboard.vue'
import AttendeeView from './components/AttendeeView.vue'

const routes = [
  { path: '/', component: Login },
  { path: '/trainer', component: TrainerDashboard },
  { path: '/attendee', component: AttendeeView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

createApp(App).use(router).mount('#app')

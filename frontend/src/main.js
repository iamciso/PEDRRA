import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'

import { getUser } from './auth.js'
import Login from './components/Login.vue'
import TrainerDashboard from './components/TrainerDashboard.vue'
import AttendeeView from './components/AttendeeView.vue'
import ProjectorView from './components/ProjectorView.vue'

const routes = [
  { path: '/', component: Login },
  { path: '/trainer', component: TrainerDashboard, meta: { requiresRole: 'Trainer' } },
  { path: '/attendee', component: AttendeeView, meta: { requiresRole: 'Attendee' } },
  { path: '/projector', component: ProjectorView, meta: { requiresRole: 'Trainer' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// #5 — Route guards: check auth before loading protected routes
router.beforeEach((to, from, next) => {
  const requiredRole = to.meta?.requiresRole;
  if (!requiredRole) return next();
  const user = getUser();
  if (!user || user.role !== requiredRole) return next('/');
  next();
})

createApp(App).use(router).mount('#app')

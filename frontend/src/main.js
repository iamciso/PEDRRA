import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'

import Login from './components/Login.vue'
import TrainerDashboard from './components/TrainerDashboard.vue'
import AttendeeView from './components/AttendeeView.vue'

const routes = [
  { path: '/', component: Login },
  { path: '/trainer', component: TrainerDashboard, meta: { requiresRole: 'Trainer' } },
  { path: '/attendee', component: AttendeeView, meta: { requiresRole: 'Attendee' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// #5 — Route guards: check auth before loading protected routes
router.beforeEach((to, from, next) => {
  const requiredRole = to.meta?.requiresRole;
  if (!requiredRole) return next();
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== requiredRole) return next('/');
    next();
  } catch {
    next('/');
  }
})

createApp(App).use(router).mount('#app')

<template>
  <div class="glass-panel" style="max-width: 400px; margin: 0 auto;">
    <h2 class="text-gradient" style="text-align: center; margin-bottom: 2rem;">PEDRRA Training</h2>
    <form @submit.prevent="handleSubmit">
      <input v-model="form.username" type="text" placeholder="Username" required aria-label="Username" />
      <input v-model="form.password" type="password" placeholder="Password" required aria-label="Password" />

      <button type="submit" aria-label="Log in">Log In</button>
      
      <p style="text-align: center; margin-top: 1rem; font-size: 0.9rem; color: #64748b;">
        Contact the Administrator if you do not have an account.
      </p>
      
      <div v-if="error" style="color: #ef4444; margin-top: 1rem; text-align: center;">{{ error }}</div>
    </form>
  </div>
</template>

<script>
import { baseUrl } from '../config.js';
import { setAuth } from '../auth.js';

export default {
  data() {
    return {
      form: { username: '', password: '' },
      error: ''
    }
  },
  methods: {
    async handleSubmit() {
      this.error = '';
      try {
        const res = await fetch(`${baseUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');

        setAuth(data.user, data.token);

        if (data.user.role === 'Trainer') {
          this.$router.push('/trainer');
        } else {
          this.$router.push('/attendee');
        }
      } catch (err) {
        this.error = err.message;
      }
    }
  }
}
</script>

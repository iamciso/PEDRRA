<template>
  <div class="glass-panel" style="max-width: 420px; margin: 0 auto;">
    <div style="text-align:center;margin-bottom:1.5rem;">
      <img src="/logo.png" style="height:50px;margin-bottom:0.5rem;" onerror="this.style.display='none'" />
      <h2 style="margin:0;color:var(--edps-blue, #1b4293);">PEDRRA Training</h2>
    </div>

    <!-- Tab toggle: PIN vs Username -->
    <div style="display:flex;margin-bottom:1.5rem;border:1px solid var(--border-color);border-radius:6px;overflow:hidden;">
      <button @click="mode='pin'" :style="{flex:1,padding:'0.6rem',border:'none',cursor:'pointer',fontWeight:'bold',fontSize:'0.9rem',background:mode==='pin'?'var(--edps-blue,#1b4293)':'#f8fafc',color:mode==='pin'?'white':'#64748b'}">🔢 PIN Code</button>
      <button @click="mode='password'" :style="{flex:1,padding:'0.6rem',border:'none',cursor:'pointer',fontWeight:'bold',fontSize:'0.9rem',background:mode==='password'?'var(--edps-blue,#1b4293)':'#f8fafc',color:mode==='password'?'white':'#64748b'}">🔑 Username</button>
    </div>

    <!-- PIN login -->
    <form v-if="mode==='pin'" @submit.prevent="loginWithPin">
      <div style="text-align:center;margin-bottom:1rem;color:#64748b;font-size:0.9rem;">Enter your 4-digit PIN</div>
      <div style="display:flex;gap:0.5rem;justify-content:center;margin-bottom:1.5rem;">
        <input v-for="(d, i) in 4" :key="i" :ref="'pin'+i" type="text" inputmode="numeric" maxlength="1" :value="pinDigits[i]" @input="onPinInput(i, $event)" @keydown.backspace="onPinBackspace(i, $event)" style="width:55px;height:60px;text-align:center;font-size:1.8rem;font-weight:bold;border-radius:8px;margin-bottom:0;" aria-label="PIN digit" />
      </div>
      <button type="submit" :disabled="pinDigits.join('').length < 4" style="width:100%;" aria-label="Log in with PIN">Enter Session</button>
    </form>

    <!-- Username+Password login -->
    <form v-else @submit.prevent="handleSubmit">
      <input v-model="form.username" type="text" placeholder="Username" required aria-label="Username" />
      <input v-model="form.password" type="password" placeholder="Password" required aria-label="Password" />
      <button type="submit" style="width:100%;" aria-label="Log in">Log In</button>
    </form>

    <div v-if="error" style="color:#ef4444;margin-top:1rem;text-align:center;font-size:0.9rem;">{{ error }}</div>

    <p style="text-align:center;margin-top:1.5rem;font-size:0.8rem;color:#94a3b8;">
      Ask the trainer for your PIN card to join the session.
    </p>
  </div>
</template>

<script>
import { baseUrl } from '../config.js';
import { setAuth } from '../auth.js';

export default {
  data() {
    return {
      mode: 'pin',
      form: { username: '', password: '' },
      pinDigits: ['', '', '', ''],
      error: ''
    }
  },
  methods: {
    onPinInput(i, e) {
      const val = e.target.value.replace(/\D/g, '');
      this.pinDigits[i] = val.slice(-1);
      e.target.value = this.pinDigits[i];
      if (val && i < 3) {
        const next = this.$refs['pin' + (i + 1)];
        if (next) (Array.isArray(next) ? next[0] : next).focus();
      }
      // Auto-submit when all 4 digits entered
      if (this.pinDigits.join('').length === 4) this.loginWithPin();
    },
    onPinBackspace(i, e) {
      if (!this.pinDigits[i] && i > 0) {
        this.pinDigits[i - 1] = '';
        const prev = this.$refs['pin' + (i - 1)];
        if (prev) (Array.isArray(prev) ? prev[0] : prev).focus();
        e.preventDefault();
      }
    },
    async loginWithPin() {
      this.error = '';
      const pin = this.pinDigits.join('');
      if (pin.length < 4) return;
      try {
        const res = await fetch(`${baseUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid PIN');
        setAuth(data.user, data.token);
        this.$router.push(data.user.role === 'Trainer' ? '/trainer' : '/attendee');
      } catch (err) {
        this.error = err.message;
        this.pinDigits = ['', '', '', ''];
        this.$nextTick(() => {
          const first = this.$refs['pin0'];
          if (first) (Array.isArray(first) ? first[0] : first).focus();
        });
      }
    },
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
        this.$router.push(data.user.role === 'Trainer' ? '/trainer' : '/attendee');
      } catch (err) {
        this.error = err.message;
      }
    }
  }
}
</script>

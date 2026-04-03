<template>
  <div class="glass-panel" style="max-width: 420px; margin: 0 auto;">
    <div style="text-align:center;margin-bottom:1.5rem;">
      <img src="/template/edps_logo.png" style="height:50px;margin-bottom:0.5rem;" onerror="this.style.display='none'" alt="EDPS logo" />
      <h2 style="margin:0;color:var(--edps-blue);">PEDRRA Training</h2>
    </div>

    <!-- Tab toggle: PIN vs Username -->
    <div style="display:flex;margin-bottom:1.5rem;border:1px solid var(--border-color);border-radius:6px;overflow:hidden;">
      <button @click="mode='pin'" :style="{flex:1,padding:'0.6rem',border:'none',cursor:'pointer',fontWeight:'bold',fontSize:'0.9rem',background:mode==='pin'?'var(--edps-blue)':'#f8fafc',color:mode==='pin'?'white':'#64748b'}">🔢 PIN Code</button>
      <button @click="mode='password'" :style="{flex:1,padding:'0.6rem',border:'none',cursor:'pointer',fontWeight:'bold',fontSize:'0.9rem',background:mode==='password'?'var(--edps-blue)':'#f8fafc',color:mode==='password'?'white':'#64748b'}">🔑 Username</button>
    </div>

    <!-- PIN login -->
    <form v-if="mode==='pin'" @submit.prevent="loginWithPin">
      <div style="text-align:center;margin-bottom:1rem;color:#64748b;font-size:0.9rem;">Enter your 4-digit PIN</div>
      <input
        ref="pinInput"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength="4"
        autocomplete="one-time-code"
        :disabled="loading"
        :value="pinDisplay"
        @input="onPinInput"
        @keypress="onPinKeypress"
        style="width:100%;height:70px;text-align:center;font-size:2.5rem;font-weight:bold;border-radius:8px;margin-bottom:1rem;letter-spacing:16px;border:2px solid var(--border-color);box-sizing:border-box;"
        placeholder="• • • •"
        aria-label="4-digit PIN"
      />
      <button type="submit" :disabled="loading" style="width:100%;" aria-label="Log in with PIN">
        <span v-if="loading">⏳ Connecting...</span>
        <span v-else>Enter Session</span>
      </button>
    </form>

    <!-- Username+Password login -->
    <form v-else @submit.prevent="handleSubmit">
      <input v-model="form.username" type="text" placeholder="Username" required aria-label="Username" :disabled="loading" />
      <input v-model="form.password" type="password" placeholder="Password" required aria-label="Password" :disabled="loading" />
      <button type="submit" style="width:100%;" aria-label="Log in" :disabled="loading">
        <span v-if="loading">⏳ Logging in...</span>
        <span v-else>Log In</span>
      </button>
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
      pinRaw: '', // raw digits only (no formatting)
      error: '',
      loading: false
    }
  },
  computed: {
    pinDisplay() { return this.pinRaw; }
  },
  methods: {
    onPinKeypress(e) {
      // Only allow digits
      if (e.key && e.key.length === 1 && !/\d/.test(e.key)) {
        e.preventDefault();
      }
    },
    onPinInput(e) {
      // Extract only digits from whatever the browser/IME gives us
      const raw = (e.target.value || '').replace(/\D/g, '').slice(0, 4);
      this.pinRaw = raw;
      // Force the DOM input to show only digits (handles IME/autocomplete quirks)
      e.target.value = raw;
      // Auto-submit when 4 digits
      if (raw.length === 4 && !this.loading) {
        this.$nextTick(() => this.loginWithPin());
      }
    },
    async loginWithPin() {
      this.error = '';
      // Read from reactive data first, fallback to DOM
      let pin = this.pinRaw;
      if (pin.length < 4) {
        const el = this.$refs.pinInput;
        if (el) pin = (el.value || '').replace(/\D/g, '');
      }
      if (pin.length < 4) {
        this.error = 'Please enter 4 digits';
        return;
      }
      if (this.loading) return;
      this.loading = true;
      this.error = '';
      try {
        const res = await fetch(`${baseUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Invalid PIN');
        }
        const data = await res.json();
        setAuth(data.user, data.token);
        this.$router.push(data.user.role === 'Trainer' ? '/trainer' : '/attendee');
      } catch (err) {
        this.error = err.message || 'Connection error. Please try again.';
        this.pinRaw = '';
        this.$nextTick(() => { this.$refs.pinInput?.focus(); });
      } finally {
        this.loading = false;
      }
    },
    async handleSubmit() {
      this.error = '';
      if (this.loading) return;
      this.loading = true;
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
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

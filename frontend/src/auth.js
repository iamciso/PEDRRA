// JWT-based auth helpers for API calls
// Uses role-based storage keys so trainer and attendee tabs don't overwrite each other

function _getRole() {
    try {
        const user = JSON.parse(localStorage.getItem('user_trainer') || localStorage.getItem('user_attendee'));
        return user?.role || '';
    } catch { return ''; }
}

function _keys(role) {
    const suffix = role === 'Trainer' ? 'trainer' : 'attendee';
    return { user: `user_${suffix}`, token: `token_${suffix}` };
}

export function getUser() {
    // Try trainer first, then attendee
    try {
        const t = localStorage.getItem('user_trainer');
        if (t) return JSON.parse(t);
        const a = localStorage.getItem('user_attendee');
        if (a) return JSON.parse(a);
    } catch {}
    // Migrate old format
    try {
        const old = localStorage.getItem('user');
        if (old) {
            const u = JSON.parse(old);
            setAuth(u, localStorage.getItem('token') || '');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            return u;
        }
    } catch {}
    return null;
}

export function getToken() {
    // Try trainer first, then attendee
    return localStorage.getItem('token_trainer') || localStorage.getItem('token_attendee') || localStorage.getItem('token') || null;
}

export function getTokenForRole(role) {
    const k = _keys(role);
    return localStorage.getItem(k.token);
}

export function setAuth(user, token) {
    const k = _keys(user?.role);
    localStorage.setItem(k.user, JSON.stringify(user));
    localStorage.setItem(k.token, token);
}

export function clearAuth() {
    localStorage.removeItem('user_trainer');
    localStorage.removeItem('token_trainer');
    localStorage.removeItem('user_attendee');
    localStorage.removeItem('token_attendee');
    // Clean up old format
    localStorage.removeItem('user');
    localStorage.removeItem('token');
}

export function clearAuthForRole(role) {
    const k = _keys(role);
    localStorage.removeItem(k.user);
    localStorage.removeItem(k.token);
}

export function authHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function authFetch(url, options = {}) {
    const headers = { ...authHeaders(), ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        clearAuth();
        window.location.href = '/';
    }
    return res;
}

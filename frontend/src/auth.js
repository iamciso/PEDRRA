// JWT-based auth helpers for API calls

export function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

export function getToken() {
    return localStorage.getItem('token');
}

export function setAuth(user, token) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
}

export function clearAuth() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
}

export function authHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function authFetch(url, options = {}) {
    const headers = { ...authHeaders(), ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    // Auto-logout on auth failure (token expired or invalid)
    if (res.status === 401) {
        clearAuth();
        window.location.href = '/';
    }
    return res;
}

// Helper to get stored user and build auth headers for API calls
export function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

export function authHeaders() {
    const user = getUser();
    return user ? { 'X-Auth-User': JSON.stringify(user) } : {};
}

export function authFetch(url, options = {}) {
    const headers = { ...authHeaders(), ...(options.headers || {}) };
    return fetch(url, { ...options, headers });
}

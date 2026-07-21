// ==========================================================================
// Capa de autenticación (modo dual).
//   - SERVIDOR (PHP local): usa /api/auth/* y guarda usuarios en JSON.
//   - LOCAL (GitHub Pages, sin PHP): guarda usuarios en localStorage.
// ⚠️ Contraseñas en texto plano por ahora (sin encriptar), como se pidió.
// ==========================================================================

window.Auth = (() => {
  const TOKEN_KEY = 'neurofocus_token';
  const USERS_KEY = 'neurofocus_users';      // modo local
  const SESSION_KEY = 'neurofocus_session';  // modo local: id del usuario activo

  let serverAvailable = null; // cache de detección de backend
  let currentUser = null;     // usuario logueado en memoria

  // --- Detección de backend (compartida con store.js) ---
  async function isServer() {
    if (serverAvailable !== null) return serverAvailable;
    try {
      const r = await fetch('api/auth/me', { headers: authHeaders() });
      const ct = r.headers.get('content-type') || '';
      serverAvailable = ct.includes('json') && (r.ok || r.status === 401);
    } catch (_) {
      serverAvailable = false;
    }
    return serverAvailable;
  }

  function token() { return localStorage.getItem(TOKEN_KEY); }
  function authHeaders() {
    const t = token();
    return t ? { Authorization: 'Bearer ' + t } : {};
  }

  // --- Utilidades del modo LOCAL ---
  function localUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (_) { return []; }
  }
  function saveLocalUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function publicUser(u) { return { id: u.id, name: u.name, email: u.email }; }

  // --- Interfaz pública ---

  // Devuelve el usuario logueado (o null). Valida la sesión persistida.
  async function me() {
    if (await isServer()) {
      if (!token()) { currentUser = null; return null; }
      const r = await fetch('api/auth/me', { headers: authHeaders() });
      if (!r.ok) { currentUser = null; return null; }
      currentUser = (await r.json()).user;
      return currentUser;
    }
    const id = localStorage.getItem(SESSION_KEY);
    currentUser = id ? (localUsers().find((u) => u.id === id) || null) : null;
    return currentUser ? publicUser(currentUser) : null;
  }

  async function register({ name, email, password }) {
    if (await isServer()) {
      const r = await fetch('api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo registrar');
      localStorage.setItem(TOKEN_KEY, data.token);
      currentUser = data.user;
      return data.user;
    }
    // Local
    const users = localUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Ese email ya está registrado');
    }
    const user = { id: 'u_' + Date.now().toString(36), name, email, password };
    users.push(user);
    saveLocalUsers(users);
    localStorage.setItem(SESSION_KEY, user.id);
    currentUser = user;
    return publicUser(user);
  }

  async function login({ email, password }) {
    if (await isServer()) {
      const r = await fetch('api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
      localStorage.setItem(TOKEN_KEY, data.token);
      currentUser = data.user;
      return data.user;
    }
    // Local
    const user = localUsers().find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) throw new Error('Email o contraseña incorrectos');
    localStorage.setItem(SESSION_KEY, user.id);
    currentUser = user;
    return publicUser(user);
  }

  async function logout() {
    if (await isServer()) {
      try { await fetch('api/auth/logout', { method: 'POST', headers: authHeaders() }); } catch (_) {}
      localStorage.removeItem(TOKEN_KEY);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    currentUser = null;
  }

  function getUser() { return currentUser; }

  return { isServer, authHeaders, me, register, login, logout, getUser };
})();

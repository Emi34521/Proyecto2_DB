
const API_BASE = "/api";

function getToken()   { return localStorage.getItem("token") || ""; }
function getUsuario() {
  try { return JSON.parse(localStorage.getItem("usuario") || "null"); }
  catch { return null; }
}
function getPermisos() {
  try { return JSON.parse(localStorage.getItem("permisos") || "{}"); }
  catch { return {}; }
}

function setSession(data) {
  localStorage.setItem("token",    data.token);
  localStorage.setItem("usuario",  JSON.stringify(data.usuario));
  localStorage.setItem("permisos", JSON.stringify(data.usuario.permisos || {}));
}

function clearSession() {
  ["token","usuario","permisos"].forEach(k => localStorage.removeItem(k));
}

function requireAuth() {
  if (!getToken()) window.location.href = "/login.html";
}

// ── Verificar permiso específico ──────────────────────────────
// Uso: canDo("ventas", "crear")  → true/false
function canDo(modulo, accion) {
  const permisos = getPermisos();
  return Array.isArray(permisos[modulo]) && permisos[modulo].includes(accion);
}

// ── Fetch centralizado ────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/csv")) {
    if (!res.ok) throw new Error("Error al exportar");
    return res.blob();
  }

  const data = await res.json();

  if (res.status === 401 && !path.includes("/auth/login")) {
    clearSession();
    window.location.href = "/login.html";
    throw new Error("Sesión expirada");
  }

  if (res.status === 403) throw new Error(data.error || "Sin permisos para esta acción");
  if (!res.ok)            throw new Error(data.error || "Error en la solicitud");
  return data;
}

const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    (path, body) => apiFetch(path, { method: "PUT",    body: JSON.stringify(body) }),
  patch:  (path, body) => apiFetch(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: "DELETE" }),
};

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = "info", ms = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ── CSV download ──────────────────────────────────────────────
async function downloadCSV(endpoint, filename) {
  try {
    const blob = await apiFetch(endpoint);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    showToast("Exportación exitosa", "success");
  } catch (e) { showToast("Error: " + e.message, "error"); }
}

// ── Render table ──────────────────────────────────────────────
function renderTable(tbodyId, rows, columns) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="${columns.length}" class="empty-state">Sin registros</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(row =>
    `<tr>${columns.map(col => `<td>${col.render ? col.render(row) : (row[col.key] ?? "—")}</td>`).join("")}</tr>`
  ).join("");
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add("open"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }

// ── Format helpers ────────────────────────────────────────────
function fmtMoney(n) {
  return "Q " + parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-GT", { year:"numeric", month:"short", day:"numeric" });
}
function fmtDatetime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-GT");
}

// ── Ocultar elemento si no tiene permiso ─────────────────────
function hideIfNoPermiso(selector, modulo, accion) {
  if (!canDo(modulo, accion)) {
    document.querySelectorAll(selector).forEach(el => el.style.display = "none");
  }
}

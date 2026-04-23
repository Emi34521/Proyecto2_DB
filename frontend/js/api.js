// js/api.js — helper centralizado para llamadas al backend
// Nginx redirige /api/* → backend:3000

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("token") || "";
}

function setSession(data) {
  localStorage.setItem("token",   data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

function getUsuario() {
  try { return JSON.parse(localStorage.getItem("usuario") || "null"); }
  catch { return null; }
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login.html";
  }
}

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

  // Si es un CSV (blob), devolverlo directo
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/csv")) {
    if (!res.ok) throw new Error("Error al exportar");
    return res.blob();
  }

  const data = await res.json();
  if (res.status === 401) {
    clearSession();
    window.location.href = "/login.html";
    throw new Error("Sesión expirada");
  }
  if (!res.ok) throw new Error(data.error || "Error en la solicitud");
  return data;
}

const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    (path, body) => apiFetch(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: "DELETE" }),
};

// ── Toast notifications ───────────────────────────────────────
function showToast(msg, type = "info", ms = 3000) {
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

// ── CSV download helper ───────────────────────────────────────
async function downloadCSV(endpoint, filename) {
  try {
    const blob = await apiFetch(endpoint);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    showToast("Exportación exitosa", "success");
  } catch (e) {
    showToast("Error al exportar: " + e.message, "error");
  }
}

// ── Generic table renderer ────────────────────────────────────
function renderTable(tbodyId, rows, columns) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${columns.length}" class="empty-state">Sin registros</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(row =>
    `<tr>${columns.map(col => `<td>${col.render ? col.render(row) : (row[col.key] ?? "—")}</td>`).join("")}</tr>`
  ).join("");
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add("open");
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
}

// ── Format helpers ────────────────────────────────────────────
function fmtMoney(n) {
  return "Q " + parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-GT", { year: "numeric", month: "short", day: "numeric" });
}
function fmtDatetime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-GT");
}

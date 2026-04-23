// js/layout.js — inyecta sidebar y configura navegación activa

function buildLayout(activePage) {
  requireAuth();
  const usuario = getUsuario();

  const nav = [
    { href: "/index.html",              icon: "◈", label: "Dashboard",   id: "dashboard" },
    { href: "/pages/productos.html",    icon: "◻", label: "Productos",   id: "productos" },
    { href: "/pages/ventas.html",       icon: "◎", label: "Ventas",      id: "ventas" },
    { href: "/pages/clientes.html",     icon: "◉", label: "Clientes",    id: "clientes" },
    { href: "/pages/empleados.html",    icon: "▣", label: "Empleados",   id: "empleados" },
    { href: "/pages/proveedores.html",  icon: "△", label: "Proveedores", id: "proveedores" },
    { href: "/pages/categorias.html",   icon: "▷", label: "Categorías",  id: "categorias" },
    { href: "/pages/compras.html",      icon: "▽", label: "Compras",     id: "compras" },
    { href: "/pages/reportes.html",     icon: "◈", label: "Reportes",    id: "reportes" },
  ];

  const initials = (usuario?.nombre || "U").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-logo">▣ TIENDA<span>Gestión de tienda</span></div>
    <nav class="sidebar-nav">
      ${nav.map(item => `
        <a href="${item.href}" class="nav-item ${activePage === item.id ? "active" : ""}">
          <span class="icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>`).join("")}
    </nav>
    <div class="sidebar-footer">
      <div class="user-badge">
        <div class="user-avatar">${initials}</div>
        <div class="user-info">
          <strong>${usuario?.nombre || "Usuario"}</strong>
          <small>${usuario?.tipo || ""}</small>
        </div>
        <button class="btn-logout" onclick="logout()" title="Cerrar sesión">⏻</button>
      </div>
    </div>
  `;
}

function logout() {
  api.post("/auth/logout", {}).finally(() => {
    clearSession();
    window.location.href = "/login.html";
  });
}

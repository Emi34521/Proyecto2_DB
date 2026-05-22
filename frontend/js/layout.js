// js/layout.js — sidebar con navegación filtrada por rol

const ROL_COLOR = {
  admin:      "badge-blue",
  vendedor:   "badge-green",
  bodeguero:  "badge-orange",
  supervisor: "badge-purple",
  consulta:   "badge-red",
};

function buildLayout(activePage) {
  requireAuth();
  const usuario  = getUsuario();
  const permisos = getPermisos();
  const tipo     = usuario?.tipo || "";

  // Definición de nav con control de visibilidad por permiso
  const nav = [
    { href: "/index.html",             icon: "◈", label: "Dashboard",   id: "dashboard",   always: true },
    { href: "/pages/productos.html",   icon: "◻", label: "Productos",   id: "productos",   modulo: "productos",   accion: "ver" },
    { href: "/pages/ventas.html",      icon: "◎", label: "Ventas",      id: "ventas",      modulo: "ventas",      accion: "ver" },
    { href: "/pages/clientes.html",    icon: "◉", label: "Clientes",    id: "clientes",    modulo: "clientes",    accion: "ver" },
    { href: "/pages/empleados.html",   icon: "▣", label: "Empleados",   id: "empleados",   modulo: "empleados",   accion: "ver" },
    { href: "/pages/proveedores.html", icon: "△", label: "Proveedores", id: "proveedores", modulo: "proveedores", accion: "ver" },
    { href: "/pages/categorias.html",  icon: "▷", label: "Categorías",  id: "categorias",  modulo: "categorias",  accion: "ver" },
    { href: "/pages/compras.html",     icon: "▽", label: "Compras",     id: "compras",     modulo: "compras",     accion: "ver" },
    { href: "/pages/reportes.html",    icon: "◈", label: "Reportes",    id: "reportes",    modulo: "reportes",    accion: "ver" },
    { href: "/pages/usuarios.html",    icon: "⊡", label: "Usuarios",    id: "usuarios",    modulo: "usuarios",    accion: "ver" },
  ];

  // Filtrar según permisos
  const navVisible = nav.filter(item => {
    if (item.always) return true;
    return canDo(item.modulo, item.accion);
  });

  const initials = (usuario?.nombre || "U").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  const rolBadge = ROL_COLOR[tipo] || "badge-blue";

  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-logo">▣ TIENDA<span>Sistema de ventas</span></div>
    <nav class="sidebar-nav">
      ${navVisible.map(item => `
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
          <small><span class="badge ${rolBadge}" style="font-size:10px">${tipo}</span></small>
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

// Redirige al dashboard si el rol no tiene acceso a la página actual
function guardPage(modulo, accion = "ver") {
  requireAuth();
  if (!canDo(modulo, accion)) {
    showToast("No tienes permiso para ver esta página", "error");
    setTimeout(() => window.location.href = "/index.html", 1500);
    return false;
  }
  return true;
}

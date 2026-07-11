"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  Clock,
  LogOut,
  ListOrdered,
  Menu,
  X,
  ChevronDown,
  ChevronsLeft,
  Search,
} from "lucide-react";
import { logoutAction } from "@/lib/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SucursalSwitcher } from "@/components/panel/SucursalSwitcher";
import type { Sucursal } from "@/lib/sucursal";
import type { User } from "@/lib/types";

type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };
type Section = { title: string; items: NavItem[] };

// Igual que kampo: ítems agrupados en secciones con cabecera + acordeón.
const SECTIONS: Section[] = [
  { title: "INICIO", items: [{ href: "/panel", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "ATENCIÓN",
    items: [
      { href: "/panel/cola", label: "Cola", icon: ListOrdered },
      { href: "/panel/turnos", label: "Turnos", icon: CalendarDays },
    ],
  },
  {
    title: "CONFIGURACIÓN",
    items: [
      { href: "/panel/servicios", label: "Servicios", icon: Scissors },
      { href: "/panel/barberos", label: "Barberos", icon: Users, adminOnly: true },
      { href: "/panel/horarios", label: "Horarios", icon: Clock },
    ],
  },
];

const isActive = (pathname: string, href: string) =>
  href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);

function filterSections(sections: Section[], q: string): Section[] {
  const s = q.trim().toLowerCase();
  if (!s) return sections;
  return sections
    .map((sec) => ({ ...sec, items: sec.items.filter((it) => it.label.toLowerCase().includes(s)) }))
    .filter((sec) => sec.items.length > 0);
}

function Avatar({ user, size = 32 }: { user: User; size?: number }) {
  const [err, setErr] = useState(false);
  const src =
    user.avatarUrl ??
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.name)}&radius=50`;
  return err ? (
    <span
      className="flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {user.name.charAt(0).toUpperCase()}
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setErr(true)}
      className="rounded-full border border-border bg-background object-cover"
      style={{ width: size, height: size }}
    />
  );
}

// ---------- Sidebar desktop (se expande al hover, como kampo) ----------
function DesktopSidebar({
  user,
  sections,
  sucursales,
  currentSucursalId,
}: {
  user: User;
  sections: Section[];
  sucursales: Sucursal[];
  currentSucursalId: string | null;
}) {
  const pathname = usePathname();
  // Igual que kampo (Layout.tsx): la sidebar se abre al pasar el mouse por encima
  // y se cierra al salir. Fija (fixed) → la versión expandida se superpone al
  // contenido, sin empujarlo ni tapar con overlay.
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const activeSection = sections.find((s) => s.items.some((it) => isActive(pathname, it.href)))?.title;
  const isSectionOpen = (title: string) =>
    !open ? true : query ? true : title in openSections ? openSections[title] : title === activeSection;
  const toggleSection = (title: string) =>
    setOpenSections((p) => ({ ...p, [title]: !(title in p ? p[title] : title === activeSection) }));

  const visible = useMemo(() => filterSections(sections, query), [sections, query]);

  return (
    <div
      className="fixed inset-y-0 left-0 z-50 hidden md:block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { setOpen(false); setQuery(""); }}
    >
      <aside
        className={`relative flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-[width] duration-300 ${
          open ? "w-64" : "w-20"
        }`}
      >
        {/* Indicador de estado sobre el borde (como kampo) */}
        <span
          title={open ? "Menú" : "Pasá el mouse para expandir"}
          className="absolute -right-3 top-8 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-md"
        >
          <ChevronsLeft className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "" : "rotate-180"}`} />
        </span>

        {/* Logo */}
        <Link href="/panel" className="flex h-14 shrink-0 items-center gap-2 overflow-hidden px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            F
          </span>
          {open && <span className="chrome-text font-display text-lg italic tracking-wide">FLOW</span>}
        </Link>

        {/* Buscador (solo abierta) */}
        {open && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar menú…"
                className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {open && sucursales.length > 0 && (
          <div className="px-3 pb-2">
            <SucursalSwitcher sucursales={sucursales} currentId={currentSucursalId} />
          </div>
        )}

        {/* Secciones + ítems */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 [scrollbar-width:thin]">
          {visible.map((section, i) => {
            const secOpen = isSectionOpen(section.title);
            return (
              <div key={section.title}>
                {open && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="mb-0.5 mt-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${secOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
                {secOpen && (
                  <ul className="space-y-0.5">
                    {section.items.map((n) => {
                      const Icon = n.icon;
                      const on = isActive(pathname, n.href);
                      return (
                        <li key={n.href}>
                          <Link
                            href={n.href}
                            title={n.label}
                            className={`flex items-center gap-x-3 rounded-md p-2 text-sm font-medium transition-colors ${
                              open ? "" : "justify-center"
                            } ${
                              on
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                            }`}
                          >
                            <Icon className="h-[18px] w-[18px] shrink-0" />
                            {open && <span className="truncate">{n.label}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {i < visible.length - 1 && open && <div className="my-2 h-px bg-sidebar-border" />}
              </div>
            );
          })}
        </nav>

        {/* Usuario + tema + logout */}
        <div className="shrink-0 space-y-1 border-t border-sidebar-border p-2">
          <div className={`flex items-center gap-2 px-1 py-1 ${open ? "" : "justify-center"}`}>
            <Avatar user={user} size={30} />
            {open && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                <p className="truncate text-xs text-flow-cyan">{user.role}</p>
              </div>
            )}
          </div>
          <div className={`flex items-center gap-2 ${open ? "justify-between px-2" : "justify-center"}`}>
            {open && <span className="text-sm text-muted-foreground">Tema</span>}
            <ThemeToggle />
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              className={`flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive ${
                open ? "" : "justify-center"
              }`}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {open && <span>Cerrar sesión</span>}
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

// ---------- Navbar + drawer mobile (arrastrable) ----------
function MobileNav({
  user,
  sections,
  sucursales,
  currentSucursalId,
}: {
  user: User;
  sections: Section[];
  sucursales: Sucursal[];
  currentSucursalId: string | null;
}) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState(false);

  const sideRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<{ x: number; y: number; w: number; mode: string | null; id: number }>({
    x: 0, y: 0, w: 0, mode: null, id: 0,
  });
  const [dragW, setDragW] = useState<number | null>(null);
  const [sideW, setSideW] = useState<number | null>(null);
  const [resizing, setResizing] = useState(false);
  const movedRef = useRef(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem("panelSidebarW"));
    if (saved && saved > 40) setSideW(saved);
  }, []);

  const full = () => (typeof window !== "undefined" ? Math.round(window.innerWidth * 0.85) : 0);
  const closeAt = () => (typeof window !== "undefined" ? Math.max(72, Math.round(window.innerWidth * 0.12)) : 72);

  const onDown = (e: React.PointerEvent) => {
    movedRef.current = false;
    gesture.current = { x: e.clientX, y: e.clientY, w: sideRef.current?.offsetWidth || sideW || full(), mode: null, id: e.pointerId };
  };
  const onMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.w) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.mode === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        g.mode = "resize";
        movedRef.current = true;
        setResizing(true);
        try { (e.currentTarget as HTMLElement).setPointerCapture(g.id); } catch {}
      } else { g.mode = "scroll"; return; }
    }
    if (g.mode !== "resize") return;
    setDragW(Math.max(0, Math.min(full(), g.w + dx)));
  };
  const onUp = () => {
    const g = gesture.current;
    if (g.mode === "resize" && dragW != null) {
      if (dragW < closeAt()) setOpenMenu(false);
      else { setSideW(dragW); try { localStorage.setItem("panelSidebarW", String(dragW)); } catch {} }
    }
    setDragW(null);
    setResizing(false);
    gesture.current = { x: 0, y: 0, w: 0, mode: null, id: 0 };
  };

  useEffect(() => { if (openMenu) { setDragW(null); setResizing(false); } }, [openMenu]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md md:hidden">
        <button
          onClick={() => setOpenMenu(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/panel" className="chrome-text font-display text-lg italic">FLOW SITE</Link>
        <Link href="/perfil"><Avatar user={user} /></Link>
      </header>

      <AnimatePresence>
        {openMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm touch-none md:hidden"
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              onClick={() => { if (!movedRef.current) setOpenMenu(false); }}
            />
            <motion.div
              ref={sideRef}
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              style={dragW != null ? { width: dragW } : sideW != null ? { width: sideW } : undefined}
              className={`fixed left-0 top-0 z-[60] flex h-[100dvh] w-[85%] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl md:hidden ${
                resizing ? "" : "transition-[width] duration-200"
              }`}
            >
              <div className="flex h-14 shrink-0 items-center justify-between px-4">
                <span className="chrome-text font-display text-xl italic">FLOW SITE</span>
                <button onClick={() => setOpenMenu(false)} className="rounded-full bg-primary p-2 text-primary-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {sucursales.length > 0 && (
                <div className="px-3 pb-2">
                  <SucursalSwitcher sucursales={sucursales} currentId={currentSucursalId} />
                </div>
              )}

              <nav className="flex-1 overflow-y-auto px-3 pb-4">
                {sections.map((section) => (
                  <div key={section.title}>
                    <p className="mb-0.5 mt-3 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </p>
                    <ul className="space-y-0.5">
                      {section.items.map((n) => {
                        const Icon = n.icon;
                        const on = isActive(pathname, n.href);
                        return (
                          <li key={n.href}>
                            <Link
                              href={n.href}
                              onClick={() => setOpenMenu(false)}
                              className={`flex items-center gap-x-3 rounded-md p-2.5 text-sm font-medium ${
                                on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                              }`}
                            >
                              <Icon className="h-[18px] w-[18px] shrink-0" /> {n.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>

              <div className="shrink-0 space-y-2 border-t border-sidebar-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tema</span>
                  <ThemeToggle />
                </div>
                <form action={logoutAction}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-md p-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <LogOut className="h-[18px] w-[18px]" /> Cerrar sesión
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function PanelShell({
  user,
  children,
  sucursales = [],
  currentSucursalId = null,
}: {
  user: User;
  children: React.ReactNode;
  sucursales?: Sucursal[];
  currentSucursalId?: string | null;
}) {
  const sections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((n) => !n.adminOnly || user.role === "admin"),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background">
      <DesktopSidebar user={user} sections={sections} sucursales={sucursales} currentSucursalId={currentSucursalId} />
      <MobileNav user={user} sections={sections} sucursales={sucursales} currentSucursalId={currentSucursalId} />
      {/* La sidebar desktop es fixed (rail w-20) → el contenido deja pl-20 y la
          versión expandida al hover se superpone sin empujar. */}
      <div className="flex w-full flex-1 flex-col overflow-y-auto pt-14 md:pt-0 md:pl-20">
        {children}
      </div>
    </div>
  );
}

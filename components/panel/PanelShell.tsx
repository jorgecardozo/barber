"use client";

import { useEffect, useRef, useState } from "react";
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
  ChevronsLeft,
} from "lucide-react";
import { logoutAction } from "@/lib/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { User } from "@/lib/types";

type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };

const NAV: NavItem[] = [
  { href: "/panel", label: "Dashboard", icon: LayoutDashboard },
  { href: "/panel/cola", label: "Cola", icon: ListOrdered },
  { href: "/panel/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/panel/servicios", label: "Servicios", icon: Scissors },
  { href: "/panel/barberos", label: "Barberos", icon: Users, adminOnly: true },
  { href: "/panel/horarios", label: "Horarios", icon: Clock },
];

const isActive = (pathname: string, href: string) =>
  href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);

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

// ---------- Sidebar desktop (se expande al hover) ----------
function DesktopSidebar({ user, items }: { user: User; items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div
      className="fixed inset-y-0 left-0 z-50 hidden md:block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className={`flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-all duration-300 ${
          open ? "w-60" : "w-[68px]"
        }`}
      >
        <Link href="/panel" className="flex h-14 items-center gap-2 overflow-hidden px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            F
          </span>
          {open && <span className="chrome-text font-display text-lg italic tracking-wide">FLOW</span>}
        </Link>

        <nav className="mt-2 flex-1 space-y-1 px-2">
          {items.map((n) => {
            const Icon = n.icon;
            const on = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                title={n.label}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  on
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {open && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2 space-y-1">
          <div className={`flex items-center gap-2 px-1 py-1 ${open ? "" : "justify-center"}`}>
            <Avatar user={user} />
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
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive ${
                open ? "" : "justify-center"
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {open && <span>Cerrar sesión</span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------- Navbar + drawer mobile (arrastrable) ----------
function MobileNav({ user, items }: { user: User; items: NavItem[] }) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState(false);

  // Resize por gesto (arrastrar a la izquierda angosta; muy angosto = cierra).
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
              <div className="flex h-14 items-center justify-between px-4">
                <span className="chrome-text font-display text-xl italic">FLOW SITE</span>
                <button onClick={() => setOpenMenu(false)} className="rounded-full bg-primary p-2 text-primary-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
                {items.map((n) => {
                  const Icon = n.icon;
                  const on = isActive(pathname, n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpenMenu(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                        on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" /> {n.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="shrink-0 border-t border-sidebar-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tema</span>
                  <ThemeToggle />
                </div>
                <form action={logoutAction}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <LogOut className="h-4 w-4" /> Cerrar sesión
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

export function PanelShell({ user, children }: { user: User; children: React.ReactNode }) {
  const items = NAV.filter((n) => !n.adminOnly || user.role === "admin");
  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background">
      <MobileNav user={user} items={items} />
      <DesktopSidebar user={user} items={items} />
      <div className="flex w-full flex-1 flex-col overflow-y-auto pt-14 md:pt-0 md:pl-[68px]">
        {children}
      </div>
    </div>
  );
}

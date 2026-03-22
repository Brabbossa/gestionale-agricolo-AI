"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ClipboardList, ScanLine, LayoutDashboard, Sprout, Package, 
  Settings, Trees, Users, FileCheck, ShoppingCart, TrendingUp, 
  FlaskConical, Container, Leaf
} from "lucide-react";
import React from 'react';
import GlobalVoiceFAB from "@/components/ui/GlobalVoiceFAB";

const mobileNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Task", href: "/task", icon: ClipboardList },
  { name: "Scanner", href: "/scanner", icon: ScanLine },
];

const desktopNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventario Vivo", href: "/inventario", icon: Sprout },
  { name: "Acquisti", href: "/ordini", icon: ShoppingCart },
  { name: "Vendite e DDT", href: "/vendite", icon: TrendingUp },
  { name: "Task", href: "/task", icon: ClipboardList },
  { name: "Scanner", href: "/scanner", icon: ScanLine },
  // ERP
  { name: "Clienti (CRM)", href: "/clienti", icon: Users },
  // Advanced Modules
  { name: "Registro Fitosanitario", href: "/trattamenti", icon: FlaskConical },
  { name: "Carrelli CC", href: "/carrelli", icon: Container },
  { name: "Produzione", href: "/produzione", icon: Leaf },
  { name: "Impostazioni", href: "/impostazioni", icon: Settings },
];

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-50 overflow-hidden font-sans">
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[120px]" />
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-700/50 bg-slate-800/60 backdrop-blur-xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <Trees className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            Nursery AI
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {desktopNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span className="text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative z-10 w-full md:w-auto h-[calc(100vh-80px)] md:h-screen overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      {/* GLOBAL VOICE FAB — visible on every page */}
      <GlobalVoiceFAB />

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-[80px] bg-slate-800/80 backdrop-blur-xl border-t border-slate-700/50 z-50 flex justify-around items-center px-2 pb-safe">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex flex-col items-center justify-center w-full h-full gap-1 pt-2"
            >
              <div className={`p-2 rounded-full transition-all duration-300 ${
                isActive 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "text-slate-400"
              }`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className={`text-xs font-medium transition-colors ${
                isActive ? "text-emerald-400" : "text-slate-500"
              }`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

    </div>
  );
}

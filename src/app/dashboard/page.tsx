"use client";

import { LayoutDashboard, Sprout, ShoppingCart, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-10 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
          <LayoutDashboard className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 mt-1">Benvenuto nel tuo Gestionale Agricolo AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/inventario" className="glass-card p-6 rounded-2xl border-2 border-transparent hover:border-emerald-500/50 transition-colors group cursor-pointer flex flex-col items-center justify-center text-center gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-full group-hover:bg-emerald-500/20 transition-colors">
            <Sprout className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">Inventario Vivo</h3>
            <p className="text-sm text-slate-400 mt-1">Gestisci le giacenze e le piante in vivaio</p>
          </div>
        </Link>

        <Link href="/ordini" className="glass-card p-6 rounded-2xl border-2 border-transparent hover:border-blue-500/50 transition-colors group cursor-pointer flex flex-col items-center justify-center text-center gap-4">
          <div className="p-4 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
            <ShoppingCart className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">Acquisti</h3>
            <p className="text-sm text-slate-400 mt-1">Gestisci ordini e fornitori</p>
          </div>
        </Link>

        <Link href="/vendite" className="glass-card p-6 rounded-2xl border-2 border-transparent hover:border-purple-500/50 transition-colors group cursor-pointer flex flex-col items-center justify-center text-center gap-4">
          <div className="p-4 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors">
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">Vendite e DDT</h3>
            <p className="text-sm text-slate-400 mt-1">Emetti documenti e traccia le uscite</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

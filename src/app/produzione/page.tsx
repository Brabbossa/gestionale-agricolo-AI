"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Leaf, Plus, Loader2, Clock, CheckCircle2, ArrowRight } from "lucide-react";

const COLUMNS = [
  { id: 'Semina', label: 'Semina / Talea', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
  { id: 'Crescita', label: 'In Crescita', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'Pronto', label: 'Pronto per la Vendita', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'Venduto', label: 'Trasferito in Inventario', color: 'bg-slate-700/50 text-slate-400 border-slate-700' }
];

export default function ProduzionePage() {
  const [lotti, setLotti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLotti();
  }, []);

  async function fetchLotti() {
    try {
      setLoading(true);
      const { data } = await supabase.from('Lotti_Produzione').select('*').order('data_semina', { ascending: false });
      setLotti(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function updateStato(id: string, newStato: string) {
    try {
      await supabase.from('Lotti_Produzione').update({ stato: newStato }).eq('id', id);
      fetchLotti();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Leaf className="w-8 h-8 text-emerald-400" />
            Pianificazione Produzione
          </h1>
          <p className="text-slate-400 mt-1">Kanban board per il ciclo di vita delle piante (Semina → Crescita → Pronto)</p>
        </div>

        <button className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full md:w-auto">
          <Plus className="w-4 h-4" />
          <span>Nuovo Lotto</span>
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colLotti = lotti.filter(l => l.stato === col.id);
            return (
              <div key={col.id} className="flex flex-col min-w-[300px] bg-slate-900/40 rounded-2xl border border-slate-800 p-4">
                <div className={`px-4 py-2 rounded-lg border mb-4 font-semibold flex justify-between items-center ${col.color}`}>
                  <span>{col.label}</span>
                  <span className="bg-slate-900/50 px-2 py-0.5 rounded text-xs">{colLotti.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {colLotti.map(lotto => (
                    <div key={lotto.id} className="glass-card p-4 hover:border-emerald-500/30 transition-colors group cursor-grab active:cursor-grabbing">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-200">{lotto.specie}</h3>
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded font-mono">
                          {lotto.n_pezzi} pz
                        </span>
                      </div>
                      
                      {lotto.varieta && <div className="text-sm text-slate-400 mb-3">{lotto.varieta}</div>}
                      
                      <div className="flex flex-col gap-2 mt-4 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                          Semina: {new Date(lotto.data_semina).toLocaleDateString('it-IT')}
                        </div>
                        {lotto.data_prevista_vendita && (
                          <div className={`flex items-center gap-2 ${new Date(lotto.data_prevista_vendita) <= new Date() && lotto.stato !== 'Venduto' ? 'text-emerald-400 font-medium' : ''}`}>
                            <Clock className="w-3.5 h-3.5" />
                            Pronto: {new Date(lotto.data_prevista_vendita).toLocaleDateString('it-IT')}
                          </div>
                        )}
                      </div>

                      {/* Quick action buttons on hover */}
                      <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {col.id === 'Semina' && (
                          <button onClick={() => updateStato(lotto.id, 'Crescita')} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                            Sposta in Crescita <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {col.id === 'Crescita' && (
                          <button onClick={() => updateStato(lotto.id, 'Pronto')} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                            Segna come Pronto <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {col.id === 'Pronto' && (
                          <button onClick={() => updateStato(lotto.id, 'Venduto')} className="flex items-center gap-1 text-xs text-slate-300 bg-slate-700 px-3 py-1.5 rounded hover:bg-slate-600 transition-colors">
                            Da inventariare
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {colLotti.length === 0 && (
                     <div className="h-full min-h-[150px] border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                       Nessun loto qui
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

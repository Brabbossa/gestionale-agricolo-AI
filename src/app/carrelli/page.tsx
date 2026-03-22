"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Container, Plus, Search, AlertTriangle, Loader2, Calendar } from "lucide-react";

export default function CarrelliPage() {
  const [carrelli, setCarrelli] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarrelli();
  }, []);

  async function fetchCarrelli() {
    try {
      setLoading(true);
      const { data } = await supabase.from('Carrelli_CC').select('*').order('data_uscita', { ascending: false });
      setCarrelli(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function segnaRientrato(id: string) {
    try {
      await supabase.from('Carrelli_CC').update({ data_rientro: new Date().toISOString() }).eq('id', id);
      fetchCarrelli();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Container className="w-8 h-8 text-emerald-400" />
            Gestione Carrelli CC
          </h1>
          <p className="text-slate-400 mt-1">Traccia i vuoti a rendere (Carrelli e Ripiani) presso i clienti</p>
        </div>

        <button className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full md:w-auto">
          <Plus className="w-4 h-4" />
          <span>Nuovo Uscita Manuale</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 border-l-4 border-l-blue-500">
          <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Totale Usciti (Da Rientrare)</div>
          <div className="text-3xl font-bold text-slate-100 mt-1">
            {carrelli.filter(c => !c.data_rientro).reduce((acc, c) => acc + c.n_carrelli, 0)}
          </div>
        </div>
        <div className="glass-card p-4 border-l-4 border-l-red-500">
          <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">In Ritardo (&gt;15gg)</div>
          <div className="text-3xl font-bold text-slate-100 mt-1">
            {carrelli.filter(c => !c.data_rientro && new Date(c.data_uscita) < new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)).reduce((acc, c) => acc + c.n_carrelli, 0)}
          </div>
        </div>
        <div className="glass-card p-4 border-l-4 border-l-emerald-500">
          <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Rientrati nel Mese</div>
          <div className="text-3xl font-bold text-slate-100 mt-1">
            {carrelli.filter(c => c.data_rientro).reduce((acc, c) => acc + c.n_carrelli, 0)}
          </div>
        </div>
      </div>

      <div className="glass-card p-4 md:p-6">
        
        <div className="flex mb-6 relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Cerca per cliente o DDT..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 border-y border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Stato</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Rif. DDT</th>
                  <th className="px-4 py-3 font-medium text-center">Carrelli</th>
                  <th className="px-4 py-3 font-medium text-center">Ripiani</th>
                  <th className="px-4 py-3 font-medium">Data Uscita</th>
                  <th className="px-4 py-3 font-medium">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {carrelli.map(c => {
                  const isReturned = !!c.data_rientro;
                  const isLate = !isReturned && new Date(c.data_uscita) < new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        {isReturned ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                            Rientrato
                          </span>
                        ) : isLate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5" /> In Ritardo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                            Fuori
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">{c.cliente_nome}</td>
                      <td className="px-4 py-3 text-slate-400">{c.numero_ddt || '-'}</td>
                      <td className="px-4 py-3 font-bold text-center text-white">{c.n_carrelli}</td>
                      <td className="px-4 py-3 font-medium text-center text-slate-400">{c.n_ripiani}</td>
                      <td className="px-4 py-3 text-slate-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4 opacity-50" />
                        {new Date(c.data_uscita).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-4 py-3">
                        {!isReturned && (
                          <button 
                            onClick={() => segnaRientrato(c.id)}
                            className="text-xs bg-slate-700 hover:bg-emerald-600 border border-slate-600 hover:border-emerald-500 text-slate-200 px-3 py-1.5 rounded transition-colors"
                          >
                            Segna Rientrato
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {carrelli.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <Container className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      Nessun movimento carrelli registrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

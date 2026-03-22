"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FlaskConical, Plus, Search, FileText, Loader2, Beaker } from "lucide-react";

export default function TrattamentiPage() {
  const [activeTab, setActiveTab] = useState<'registro' | 'prodotti'>('registro');
  const [trattamenti, setTrattamenti] = useState<any[]>([]);
  const [prodotti, setProdotti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'registro') {
        const { data } = await supabase.from('Trattamenti').select('*').order('data', { ascending: false });
        setTrattamenti(data || []);
      } else {
        const { data } = await supabase.from('Prodotti_Fitosanitari').select('*').order('nome');
        setProdotti(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-emerald-400" />
            Quaderno di Campagna
          </h1>
          <p className="text-slate-400 mt-1">Registro ufficiale dei trattamenti fitosanitari</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('registro')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'registro' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            Registro Interventi
          </button>
          <button 
            onClick={() => setActiveTab('prodotti')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'prodotti' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            Magazzino Prodotti
          </button>
        </div>
      </div>

      <div className="glass-card p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder={activeTab === 'registro' ? "Cerca per lotto o prodotto..." : "Cerca prodotto..."}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
             {activeTab === 'registro' && (
                <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700">
                  <FileText className="w-4 h-4" />
                  <span>Stampa PDF ASL</span>
                </button>
             )}
            <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              <span>Nuovo {activeTab === 'registro' ? 'Trattamento' : 'Prodotto'}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'registro' ? (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 border-y border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Prodotto</th>
                    <th className="px-4 py-3 font-medium">Quantità</th>
                    <th className="px-4 py-3 font-medium">Lotto/Serra</th>
                    <th className="px-4 py-3 font-medium">Operatore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {trattamenti.map(t => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">{new Date(t.data).toLocaleDateString('it-IT')}</td>
                      <td className="px-4 py-3 font-medium text-emerald-400">{t.prodotto_nome}</td>
                      <td className="px-4 py-3">{t.quantita_usata} {t.unita_misura}</td>
                      <td className="px-4 py-3 text-slate-400">{t.lotto}</td>
                      <td className="px-4 py-3">{t.operatore}</td>
                    </tr>
                  ))}
                  {trattamenti.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        Nessun trattamento registrato.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 border-y border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome Prodotto</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Giacenza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {prodotti.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-emerald-400 flex items-center gap-2">
                        <Beaker className="w-4 h-4 text-emerald-500/50" />
                        {p.nome}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{p.tipo}</td>
                      <td className="px-4 py-3">{p.giacenza} {p.unita_misura}</td>
                    </tr>
                  ))}
                  {prodotti.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        Nessun prodotto fitosanitario in magazzino.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

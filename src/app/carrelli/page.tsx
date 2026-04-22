"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Container, Plus, Search, AlertTriangle, Loader2, Calendar } from "lucide-react";

export default function CarrelliPage() {
  const [carrelli, setCarrelli] = useState<any[]>([]);
  const [clienti, setClienti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ codice_carrello: '', cliente_id: '', note: '' });

  useEffect(() => {
    fetchCarrelli();
    fetchClienti();
  }, []);

  async function fetchClienti() {
    const { data } = await supabase.from('Anagrafica').select('id, ragione_sociale').eq('tipo', 'Cliente');
    setClienti(data || []);
  }

  async function fetchCarrelli() {
    try {
      setLoading(true);
      const { data } = await supabase.from('Carrelli_CC').select('*, Anagrafica(ragione_sociale)').order('data_uscita', { ascending: false });
      const mappedData = (data || []).map(c => ({
        ...c,
        cliente_nome: c.Anagrafica?.ragione_sociale || 'Sconosciuto'
      }));
      setCarrelli(mappedData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('Carrelli_CC').insert([{ ...formData, data_uscita: new Date().toISOString() }]);
    setModalOpen(false);
    setFormData({ codice_carrello: '', cliente_id: '', note: '' });
    fetchCarrelli();
  }

  const filteredCarrelli = carrelli.filter(c => 
    c.cliente_nome?.toLowerCase().includes(search.toLowerCase()) || 
    c.codice_carrello?.toLowerCase().includes(search.toLowerCase())
  );

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

        <button onClick={() => setModalOpen(true)} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full md:w-auto">
          <Plus className="w-4 h-4" />
          <span>Nuovo Uscita Manuale</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 border-l-4 border-l-blue-500">
          <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Totale Usciti (Da Rientrare)</div>
          <div className="text-3xl font-bold text-slate-100 mt-1">
            {carrelli.filter(c => !c.data_rientro).length}
          </div>
        </div>
        <div className="glass-card p-4 border-l-4 border-l-red-500">
          <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">In Ritardo (&gt;15gg)</div>
          <div className="text-3xl font-bold text-slate-100 mt-1">
            {carrelli.filter(c => !c.data_rientro && new Date(c.data_uscita) < new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)).length}
          </div>
        </div>
        <div className="glass-card p-4 border-l-4 border-l-emerald-500">
          <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Rientrati nel Mese</div>
          <div className="text-3xl font-bold text-slate-100 mt-1">
            {carrelli.filter(c => c.data_rientro).length}
          </div>
        </div>
      </div>

      <div className="glass-card p-4 md:p-6">
        
        <div className="flex mb-6 relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Cerca per cliente o codice..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
                  <th className="px-4 py-3 font-medium">Codice Carrello</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium">Data Uscita</th>
                  <th className="px-4 py-3 font-medium">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredCarrelli.map(c => {
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
                      <td className="px-4 py-3 font-bold text-white">{c.codice_carrello}</td>
                      <td className="px-4 py-3 font-medium text-slate-200">{c.cliente_nome}</td>
                      <td className="px-4 py-3 text-slate-400">{c.note || '-'}</td>
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
                {filteredCarrelli.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-100">Nuova Uscita Carrello</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Codice Carrello *</label>
                <input required type="text" value={formData.codice_carrello} onChange={e => setFormData({...formData, codice_carrello: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Cliente *</label>
                <select required value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500">
                  <option value="">Seleziona cliente...</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>{c.ragione_sociale}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Note</label>
                <input type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Annulla</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">Registra Uscita</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

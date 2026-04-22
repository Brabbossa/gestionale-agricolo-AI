"use client";
import { Users, Search, Plus, Trash2, Edit2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Anagrafica = {
  id: string;
  tipo: 'Cliente' | 'Fornitore';
  categoria: string | null;
  ragione_sociale: string;
  partita_iva: string;
  codice_fiscale: string | null;
  indirizzo_sede: string | null;
  codice_sdi_pec: string | null;
  email: string | null;
  telefono: string | null;
  persona_riferimento: string | null;
  iban: string | null;
  condizioni_pagamento: string | null;
  note: string | null;
};

export default function ClientiPage() {
  const [records, setRecords] = useState<Anagrafica[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const initialFormState: Partial<Anagrafica> = { tipo: 'Cliente', categoria: '', ragione_sociale: '', partita_iva: '', email: '', telefono: '', persona_riferimento: '', iban: '', condizioni_pagamento: '', note: '' };
  const [formData, setFormData] = useState<Partial<Anagrafica>>(initialFormState);
  const [saving, setSaving] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from('Anagrafica').select('*').order('ragione_sociale');
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (formData.id) {
      // Update
      await supabase.from('Anagrafica').update(formData).eq('id', formData.id);
    } else {
      // Insert
      await supabase.from('Anagrafica').insert({
        ...formData,
        partita_iva: formData.partita_iva || `TEMP-${Date.now()}` // Fallback if missing for MVP
      });
    }
    setModalOpen(false);
    setFormData(initialFormState);
    setSaving(false);
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questa anagrafica?")) {
      await supabase.from('Anagrafica').delete().eq('id', id);
      fetchRecords();
    }
  };

  const filteredRecords = records.filter(r => 
    r.ragione_sociale.toLowerCase().includes(search.toLowerCase()) || 
    r.partita_iva.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Anagrafica</h1>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
             <input 
              type="text" 
              placeholder="Cerca Ragione Sociale / P.IVA" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button 
            onClick={() => { setFormData(initialFormState); setModalOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition-colors flex items-center gap-2 px-4 shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Nuova Anagrafica</span>
          </button>
        </div>
      </div>

      <div className="glass-card w-full overflow-hidden p-0 border-t border-b border-l-0 border-r-0 md:border-2 md:rounded-2xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700/50">
                <th className="p-4 font-medium text-slate-400 text-sm">Tipo / Categoria</th>
                <th className="p-4 font-medium text-slate-400 text-sm">Ragione Sociale</th>
                <th className="p-4 font-medium text-slate-400 text-sm">Partita IVA</th>
                <th className="p-4 font-medium text-slate-400 text-sm hidden sm:table-cell">Contatti</th>
                <th className="p-4 font-medium text-slate-400 text-sm hidden lg:table-cell">SDI/PEC</th>
                <th className="p-4 font-medium text-right text-slate-400 text-sm">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Caricamento in corso...</td></tr>
              ) : filteredRecords.length > 0 ? filteredRecords.map(rec => (
                <tr key={rec.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md inline-block ${rec.tipo === 'Cliente' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {rec.tipo}
                      </span>
                      {rec.categoria && <span className="text-xs text-slate-400">{rec.categoria}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-slate-100 font-medium">{rec.ragione_sociale}</td>
                  <td className="p-4 text-emerald-400 font-mono text-sm">{rec.partita_iva}</td>
                  <td className="p-4 text-slate-400 text-sm hidden sm:table-cell truncate max-w-[200px]">
                    <div className="flex flex-col">
                      {rec.telefono && <span>{rec.telefono}</span>}
                      {rec.email && <span className="text-xs opacity-70">{rec.email}</span>}
                      {!rec.telefono && !rec.email && <span>-</span>}
                    </div>
                  </td>
                  <td className="p-4 text-slate-400 text-sm hidden lg:table-cell">{rec.codice_sdi_pec || '-'}</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button onClick={() => { setFormData(rec); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(rec.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nessuna anagrafica trovata {search && 'con questo criterio di ricerca'}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-100">{formData.id ? 'Modifica Anagrafica' : 'Nuova Anagrafica'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              {/* Dati Generali */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 border-b border-slate-700 pb-1">Dati Generali</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Tipo *</label>
                    <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as 'Cliente'|'Fornitore'})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500">
                      <option value="Cliente">Cliente</option>
                      <option value="Fornitore">Fornitore</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Categoria</label>
                    <select value={formData.categoria || ''} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500">
                      <option value="">Seleziona...</option>
                      <option value="Privato">Privato</option>
                      <option value="Azienda Agricola">Azienda Agricola</option>
                      <option value="Paesaggista / Giardiniere">Paesaggista / Giardiniere</option>
                      <option value="Garden Center">Garden Center</option>
                      <option value="GDO">GDO</option>
                      <option value="Grossista">Grossista</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Ragione Sociale *</label>
                    <input required type="text" value={formData.ragione_sociale} onChange={e => setFormData({...formData, ragione_sociale: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Indirizzo Sede</label>
                    <input type="text" value={formData.indirizzo_sede || ''} onChange={e => setFormData({...formData, indirizzo_sede: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Contatti */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 border-b border-slate-700 pb-1">Contatti</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Telefono</label>
                    <input type="tel" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Email</label>
                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Persona di Riferimento</label>
                    <input type="text" value={formData.persona_riferimento || ''} onChange={e => setFormData({...formData, persona_riferimento: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" placeholder="Nome referente (es. Marco acquisti)" />
                  </div>
                </div>
              </div>

              {/* Amministrazione */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 border-b border-slate-700 pb-1">Amministrazione</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Partita IVA *</label>
                    <input required type="text" value={formData.partita_iva} onChange={e => setFormData({...formData, partita_iva: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Codice Fiscale</label>
                    <input type="text" value={formData.codice_fiscale || ''} onChange={e => setFormData({...formData, codice_fiscale: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Codice SDI / PEC</label>
                    <input type="text" value={formData.codice_sdi_pec || ''} onChange={e => setFormData({...formData, codice_sdi_pec: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Condizioni Pagamento</label>
                    <select value={formData.condizioni_pagamento || ''} onChange={e => setFormData({...formData, condizioni_pagamento: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500">
                      <option value="">Seleziona...</option>
                      <option value="Bonifico Anticipato">Bonifico Anticipato</option>
                      <option value="Bonifico 30gg">Bonifico 30gg DF</option>
                      <option value="Bonifico 60gg">Bonifico 60gg DF</option>
                      <option value="RiBa 30gg">RiBa 30gg</option>
                      <option value="RiBa 60gg">RiBa 60gg</option>
                      <option value="Contanti alla consegna">Contanti alla consegna</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">IBAN</label>
                    <input type="text" value={formData.iban || ''} onChange={e => setFormData({...formData, iban: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-sm" placeholder="IT00A0000000000000000000000" />
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 border-b border-slate-700 pb-1">Info Aggiuntive</h4>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Note Interne</label>
                  <textarea rows={3} value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 resize-none" placeholder="Orari di scarico, indicazioni logistiche..." />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Annulla</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                  {saving ? 'Salvataggio...' : 'Salva Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

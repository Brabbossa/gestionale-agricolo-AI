"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Map as MapIcon, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Tipi dati DB
type Location = {
  id: string;
  nome_zona: string;
  tipo: string;
};

type InventoryLotto = {
  id: string;
  location_id: string;
  nome_pianta: string;
  quantita: number;
  stato_salute: string;
};

const HEALTH_COLORS: Record<string, string> = {
  'Ottimo': 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  'Attenzione': 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
  'Emergenza': 'border-red-500/50 bg-red-500/10 text-red-400'
};

export default function VoiceDashboard() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [lotti, setLotti] = useState<InventoryLotto[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    const { data: locData } = await supabase.from('locations').select('*').order('nome_zona');
    const { data: lottiData } = await supabase.from('inventory_lotti').select('*');
    
    if (locData) setLocations(locData);
    if (lottiData) setLotti(lottiData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Setup Realtime subscriptions
    const channel = supabase.channel('dashboard_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_lotti' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Restituisce statistiche di una zona
  const getZoneStats = (zoneId: string) => {
    const lottiZona = lotti.filter(l => l.location_id === zoneId);
    const totalPiante = lottiZona.reduce((acc, l) => acc + (l.quantita || 0), 0);
    const hasEmergency = lottiZona.some(l => l.stato_salute === 'Emergenza');
    const hasWarning = lottiZona.some(l => l.stato_salute === 'Attenzione');
    
    let colorStatus = 'bg-emerald-500/20 border-emerald-500/30';
    if (hasWarning) colorStatus = 'bg-yellow-500/20 border-yellow-500/30';
    if (hasEmergency) colorStatus = 'bg-red-500/20 border-red-500/30';

    return { totalPiante, totaleLotti: lottiZona.length, colorStatus };
  };

  return (
    <div className="relative w-full h-full flex flex-col p-4 md:p-8 overflow-hidden bg-slate-900 text-slate-50">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
          <MapIcon className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100 flex-1">
          {selectedLocation ? selectedLocation.nome_zona : 'Mappa del Vivaio'}
        </h1>
        {selectedLocation && (
          <button 
            onClick={() => setSelectedLocation(null)}
            className="flex items-center gap-1 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" /> Torna alle Zone
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-8">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-500 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700 mx-auto max-w-xl text-center">
            <MapIcon className="w-12 h-12 mb-4 opacity-50 mx-auto" />
            <p>Nessuna zona configurata. Premi il pulsante verde e dì: "Crea una zona chiamata Serra 1".</p>
          </div>
        ) : !selectedLocation ? (
          // Vista ZONE / SETTORI
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {locations.map(loc => {
              const stats = getZoneStats(loc.id);
              return (
                <div 
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc)}
                  className={`glass-card p-5 cursor-pointer rounded-2xl hover:scale-[1.02] transition-transform duration-200 border-2 ${stats.colorStatus} hover:border-emerald-400`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-slate-100">{loc.nome_zona}</h3>
                    <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-900/50 text-slate-300 uppercase tracking-widest">{loc.tipo || 'Zona'}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">Totale Piante: <strong className="text-slate-200 text-lg">{stats.totalPiante}</strong></p>
                    <p className="text-sm text-slate-400">Lotti Attivi: <strong className="text-slate-200">{stats.totaleLotti}</strong></p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Vista LOTTI dentro una ZONA
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {lotti.filter(l => l.location_id === selectedLocation.id).length === 0 ? (
              <div className="col-span-full text-center py-20 text-slate-500">
                Nessun lotto presente in questa zona. Usa il pulsante vocale per aggiungere piante.
              </div>
            ) : (
              lotti.filter(l => l.location_id === selectedLocation.id).map(lotto => (
                <div key={lotto.id} className={`glass-card bg-slate-800/80 p-5 rounded-2xl border-l-4 ${HEALTH_COLORS[lotto.stato_salute || 'Ottimo']?.split(' ')[0] || 'border-slate-500'}`}>
                  <h4 className="text-lg font-bold text-slate-100 mb-4">{lotto.nome_pianta}</h4>
                  <div className="flex justify-between items-end">
                    <div className="space-y-1 flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Quantità</span>
                      <p className="text-2xl font-bold text-slate-200 leading-none">{lotto.quantita} <span className="text-sm font-normal text-slate-500">pz</span></p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${HEALTH_COLORS[lotto.stato_salute || 'Ottimo']}`}>
                      {lotto.stato_salute || 'Sconosciuto'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}

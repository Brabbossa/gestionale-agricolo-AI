"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle, CheckCircle2, Leaf, Package, Trash2, Zap, ClipboardList, Map as MapIcon, ChevronLeft } from 'lucide-react';
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

const AZIONE_ICONS: Record<string, React.ReactNode> = {
  CARICO: <Package className="w-5 h-5" />,
  SCARICO: <Package className="w-5 h-5" />,
  SCARTO: <Trash2 className="w-5 h-5" />,
  SPOSTAMENTO: <Zap className="w-5 h-5" />,
  TASK: <ClipboardList className="w-5 h-5" />,
  ORDINE: <Package className="w-5 h-5" />,
  ELIMINA: <Trash2 className="w-5 h-5" />,
  TRATTAMENTO: <Leaf className="w-5 h-5" />,
  SEMINA: <Leaf className="w-5 h-5" />,
  UNKNOWN: <AlertCircle className="w-5 h-5" />,
};

const AZIONE_COLORS: Record<string, string> = {
  CARICO: 'bg-emerald-500 text-white',
  SCARICO: 'bg-orange-500 text-white',
  SCARTO: 'bg-red-500 text-white',
  SPOSTAMENTO: 'bg-blue-500 text-white',
  TASK: 'bg-purple-500 text-white',
  ORDINE: 'bg-yellow-500 text-slate-900',
  ELIMINA: 'bg-red-600 text-white',
  TRATTAMENTO: 'bg-teal-500 text-white',
  SEMINA: 'bg-green-500 text-white',
  UNKNOWN: 'bg-slate-700 text-white',
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

  // Microfono e feedback
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [toast, setToast] = useState<{ action: string; message: string; show: boolean } | null>(null);
  const [pendingCmd, setPendingCmd] = useState<any>(null);

  const recognitionRef = useRef<any>(null);

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

  // Timer per nascondere il toast
  useEffect(() => {
    if (toast?.show) {
      const t = setTimeout(() => {
        setToast(prev => prev ? { ...prev, show: false } : null);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [toast?.show]);

  // Init Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'it-IT';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setTranscript("");
        };

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          setToast({ action: 'UNKNOWN', message: 'Errore microfono. Riprova.', show: true });
        };

        recognitionRef.current.onend = async () => {
          setIsListening(false);
          const finalTranscript = recognitionRef.current?.lastTranscript;
          if (finalTranscript?.length > 2) {
            await processVoiceCommand(finalTranscript);
          }
        };
      } else {
        setToast({ action: 'UNKNOWN', message: 'Browser senza supporto vocale. Usa Chrome.', show: true });
      }
    }
    return () => { recognitionRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lastTranscript = transcript;
    }
  }, [transcript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!pendingCmd) setToast(null); // Tieni il toast visibile se aspettiamo risposta
      try { recognitionRef.current?.start(); } catch (e) { console.error(e); }
    }
  };

  const processVoiceCommand = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setTranscript("");

    try {
      // Chiama l'API Next.js
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, pendingCmd }),
      });

      const data = await response.json();

      if (!response.ok && !data.needs_confirmation) {
        throw new Error(data.error || 'Errore di processamento');
      }

      if (data.needs_confirmation) {
        setPendingCmd(data.pendingCmd);
        setToast({ action: 'ELIMINA', message: data.message, show: true });
        setIsProcessing(false);
        // Autostart microfono per aspettare il "Si" o "No"
        setTimeout(() => {
          if (recognitionRef.current && !isListening) {
            try { recognitionRef.current.start(); } catch (e) { console.error(e); }
          }
        }, 1200);
        return;
      }

      // Se operazione normale o annullata, puliamo il pending
      setPendingCmd(null);

      setToast({ 
        action: data.result?.azione || 'UNKNOWN', 
        message: data.message || 'Operazione completata', 
        show: true 
      });

    } catch (error: any) {
      setPendingCmd(null);
      setToast({ action: 'UNKNOWN', message: error.message || 'Errore non specificato.', show: true });
    } finally {
      setIsProcessing(false);
    }
  };

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
      <div className="flex-1 overflow-y-auto pb-40">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-500 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700 mx-auto max-w-xl text-center">
            <MapIcon className="w-12 h-12 mb-4 opacity-50 mx-auto" />
            <p>Nessuna zona configurata. Aggiungi zone via voce (es: "Crea una zona chiamata Serra 1").</p>
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
                Nessun lotto presente in questa zona.
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

      {/* FAB: Floating Action Button (Mic) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4 w-full px-4 pointer-events-none">
        
        {/* Toast di Feedback Dinamico */}
        <div className={`transition-all duration-500 transform pointer-events-auto ${
          toast?.show 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-8 opacity-0 scale-95'
        }`}>
          {toast && (
            <div className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md ${AZIONE_COLORS[toast.action] || AZIONE_COLORS.UNKNOWN}`}>
              {AZIONE_ICONS[toast.action]}
              <span className="font-semibold text-base">{toast.message}</span>
            </div>
          )}
        </div>

        {/* Trascrizione (mostrata mentre si parla o processa) */}
        {(isListening || isProcessing) && !toast?.show && (
          <div className="bg-slate-900/90 border border-slate-700/50 px-6 py-3 rounded-2xl max-w-sm text-center shadow-xl animate-in fade-in slide-in-from-bottom-5">
            <p className="text-emerald-400 font-medium italic text-sm">
              {isProcessing ? "Elaborazione in corso..." : (transcript || "In ascolto...")}
            </p>
          </div>
        )}

        {/* Pulsante Microfono Principale */}
        <div className={`transition-all duration-300 pointer-events-auto mt-2 ${isListening ? 'ripple-container' : ''}`}>
          <button
            onClick={toggleListening}
            disabled={isProcessing}
            className={`flex items-center justify-center w-24 h-24 rounded-full 
              transition-all duration-300 ease-out shadow-[0_0_40px_rgba(0,0,0,0.5)]
              ${isProcessing ? 'bg-slate-700 cursor-not-allowed opacity-50' :
                isListening
                  ? (pendingCmd ? 'bg-red-500 hover:bg-red-400 recording-pulse scale-110' : 'bg-emerald-500 hover:bg-emerald-400 recording-pulse scale-110')
                  : (pendingCmd ? 'bg-red-600 hover:bg-red-500 border-4 border-slate-900 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500 border-4 border-slate-900')
              }`}
            aria-label={isListening ? "Ferma registrazione" : "Inizia registrazione"}
          >
            {isProcessing ? (
              <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
            ) : isListening ? (
              <Square className="w-10 h-10 text-emerald-950 fill-current" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </button>
        </div>
      </div>

    </div>
  );
}

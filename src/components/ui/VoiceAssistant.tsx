"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle, CheckCircle2, Leaf, Trash2, Package, ClipboardList, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ChatEntry = {
  id: string;
  user_message: string;
  ai_response: string;
  azione: string;
  success: boolean;
  createdAt: string;
};

const AZIONE_ICONS: Record<string, React.ReactNode> = {
  CARICO: <Package className="w-3.5 h-3.5" />,
  SCARICO: <Package className="w-3.5 h-3.5" />,
  SCARTO: <Trash2 className="w-3.5 h-3.5" />,
  SPOSTAMENTO: <Zap className="w-3.5 h-3.5" />,
  TASK: <ClipboardList className="w-3.5 h-3.5" />,
  ORDINE: <Package className="w-3.5 h-3.5" />,
  ELIMINA: <Trash2 className="w-3.5 h-3.5" />,
};

const AZIONE_COLORS: Record<string, string> = {
  CARICO: 'bg-emerald-500/20 text-emerald-400',
  SCARICO: 'bg-orange-500/20 text-orange-400',
  SCARTO: 'bg-red-500/20 text-red-400',
  SPOSTAMENTO: 'bg-blue-500/20 text-blue-400',
  TASK: 'bg-purple-500/20 text-purple-400',
  ORDINE: 'bg-yellow-500/20 text-yellow-400',
  ELIMINA: 'bg-red-600/20 text-red-400',
  UNKNOWN: 'bg-slate-700/50 text-slate-400',
};

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('Chat_History')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(50);
    setHistory(data || []);
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

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
          setFeedback({ type: 'info', message: 'In ascolto...' });
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
          setFeedback({ type: 'error', message: 'Errore microfono. Riprova.' });
        };

        recognitionRef.current.onend = async () => {
          setIsListening(false);
          if (recognitionRef.current?.lastTranscript?.length > 2) {
            await processVoiceCommand(recognitionRef.current.lastTranscript);
          }
        };
      } else {
        setFeedback({ type: 'error', message: 'Browser senza supporto vocale. Usa Chrome.' });
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
      setFeedback(null);
      try { recognitionRef.current?.start(); } catch (e) { console.error(e); }
    }
  };

  const processVoiceCommand = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setFeedback({ type: 'info', message: 'Analisi del comando in corso...' });

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore di processamento');
      }

      setFeedback({ type: 'success', message: data.message });
      // Refresh history after command
      await fetchHistory();

    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Errore non specificato.' });
      await fetchHistory();
    } finally {
      setIsProcessing(false);
      setTranscript("");
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-0 md:gap-6 p-4 md:p-8 overflow-hidden">

      {/* ───────────── LEFT: HISTORY PANEL ───────────── */}
      <div className="md:w-1/2 lg:w-2/5 flex flex-col min-h-0 order-2 md:order-1">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Registro Comandi</h2>
          <span className="text-xs text-slate-600">({history.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[200px] md:min-h-0">
          {historyLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento...</div>
          ) : history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-600 text-sm">
              <Mic className="w-8 h-8 opacity-30" />
              <p>Nessun comando ancora. Inizia a parlare!</p>
            </div>
          ) : (
            // Show most recent last on desktop, or most recent first on mobile
            [...history].reverse().map((entry) => (
              <div key={entry.id} className="glass-card p-3 space-y-2 hover:border-slate-600 transition-colors">
                {/* User message */}
                <div className="flex items-start gap-2">
                  <Mic className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300 leading-relaxed italic">"{entry.user_message}"</p>
                </div>
                {/* AI response */}
                <div className={`flex items-start gap-2 ${entry.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {entry.success
                    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  }
                  <p className="text-xs leading-relaxed">{entry.ai_response}</p>
                </div>
                {/* Footer: azione badge + time */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${AZIONE_COLORS[entry.azione] || AZIONE_COLORS.UNKNOWN}`}>
                    {AZIONE_ICONS[entry.azione]}
                    {entry.azione}
                  </span>
                  <span className="text-xs text-slate-600">
                    {new Date(entry.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ───────────── RIGHT: MIC PANEL ───────────── */}
      <div className="md:w-1/2 lg:w-3/5 flex flex-col items-center justify-center gap-6 order-1 md:order-2 py-6 md:py-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-full mb-2 ring-1 ring-emerald-500/20">
            <Leaf className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Assistente Vocale</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Tocca il microfono e parla. Puoi caricare, scaricare, ordinare, creare task o <strong className="text-red-400">eliminare</strong> elementi.
          </p>
        </div>

        {/* Microphone Button */}
        <div className="relative flex justify-center py-4">
          <div className={`transition-all duration-300 ${isListening ? 'ripple-container' : ''}`}>
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`relative z-10 flex items-center justify-center w-32 h-32 rounded-full 
                transition-all duration-300 ease-out shadow-2xl
                ${isProcessing ? 'bg-slate-700 cursor-not-allowed opacity-50' :
                  isListening
                    ? 'bg-emerald-500 hover:bg-emerald-400 recording-pulse scale-105'
                    : 'bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-emerald-500/50'
                }`}
              aria-label={isListening ? "Ferma registrazione" : "Inizia registrazione"}
            >
              {isProcessing ? (
                <Loader2 className="w-12 h-12 text-slate-300 animate-spin" />
              ) : isListening ? (
                <Square className="w-12 h-12 text-emerald-950 fill-current" />
              ) : (
                <Mic className="w-12 h-12 text-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* Real-time Transcript */}
        <div className="w-full max-w-sm min-h-[70px] glass-card flex flex-col">
          <h3 className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Trascrizione</h3>
          <p className={`text-base transition-opacity ${!transcript && !isListening ? 'text-slate-600 italic text-sm' : 'text-slate-100'}`}>
            {transcript || (isListening ? "Sto ascoltando..." : "In attesa di comando...")}
          </p>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`w-full max-w-sm p-3 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2
            ${feedback.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
            {feedback.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> :
             feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> :
             <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        )}

        {/* Quick Help */}
        <div className="w-full max-w-sm text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-500 mb-1">Esempi comandi:</p>
          <p>📦 "Sono arrivate 30 rose rosse alla Serra 1"</p>
          <p>🛒 "Bisogna comprare altre 20 orchidee bianche"</p>
          <p>📋 "Ricordati di irrigare le piante domani mattina"</p>
          <p>🗑️ "Cancella il task delle orchidee"</p>
          <p>🗑️ "Elimina l'ordine delle rose"</p>
        </div>
      </div>
    </div>
  );
}

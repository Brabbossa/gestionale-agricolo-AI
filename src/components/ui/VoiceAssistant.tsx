"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle, CheckCircle2, Leaf } from 'lucide-react';

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);

  // References for Web Speech API
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize SpeechRecognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'it-IT'; // Default to Italian for the nursery (vivaio) context

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setFeedback({ type: 'info', message: 'In ascolto...' });
          setTranscript("");
          setParsedData(null);
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
          // Only process if we have a significant transcript
          if (recognitionRef.current && recognitionRef.current.lastTranscript?.length > 2) {
            await processVoiceCommand(recognitionRef.current.lastTranscript);
          }
        };
      } else {
        setFeedback({ 
          type: 'error', 
          message: 'Il tuo browser non supporta il riconoscimento vocale. Usa Chrome o Safari.' 
        });
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Effect to sync transcript for onend processing
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
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Could not start recognition", e);
      }
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

      setParsedData({ comando: data.result, magazzino: data.plant });
      setFeedback({ 
        type: 'success', 
        message: data.message || 'Comando elaborato e salvato nel Database con successo!' 
      });

    } catch (error: any) {
      console.error('Error processing command:', error);
      setFeedback({ 
        type: 'error', 
        message: error.message || 'Non ho capito il comando, puoi ripetere specificando la pianta e la quantità?' 
      });
      setParsedData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6 space-y-8">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-full mb-4 ring-1 ring-emerald-500/20">
          <Leaf className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">
          Assistente Vocale
        </h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          Tocca il microfono e descrivi l'operazione da registrare (es. "Scarico 20 rose rosse, rami spezzati").
        </p>
      </div>

      {/* Main Microphone Button */}
      <div className="relative flex justify-center py-8">
        <div className={`transition-all duration-300 ${isListening ? 'ripple-container' : ''}`}>
          <button
            onClick={toggleListening}
            disabled={isProcessing}
            className={`
              relative z-10 flex items-center justify-center w-32 h-32 rounded-full 
              transition-all duration-300 ease-out shadow-2xl
              ${isProcessing ? 'bg-slate-700 cursor-not-allowed opacity-50' : 
                isListening 
                  ? 'bg-emerald-500 hover:bg-emerald-400 recording-pulse scale-105' 
                  : 'bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-emerald-500/50'
              }
            `}
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
      <div className="w-full min-h-[100px] glass-card flex flex-col transition-all">
        <h3 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">Trascrizione</h3>
        <p className={`text-lg transition-opacity ${!transcript && !isListening ? 'text-slate-500 italic' : 'text-slate-100'}`}>
          {transcript || (isListening ? "In ascolto..." : "In attesa di comando vocale...")}
        </p>
      </div>

      {/* Feedback & Results Area */}
      {feedback && (
        <div className={`w-full p-4 rounded-xl border flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-2
          ${feedback.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
            feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
            'bg-blue-500/10 border-blue-500/20 text-blue-400'}
        `}>
          {feedback.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : 
           feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : 
           <Loader2 className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" />}
          
          <div className="flex-1">
            <p className="font-medium leading-relaxed">{feedback.message}</p>
            
            {/* Parsed JSON Data Display */}
            {parsedData && feedback.type === 'success' && (
              <div className="mt-4 p-4 bg-black/30 rounded-lg border border-white/5 overflow-x-auto">
                <p className="text-xs text-emerald-500/70 mb-2 font-mono uppercase">SINCRONIZZAZIONE DATABASE:</p>
                <pre className="text-sm font-mono text-emerald-300/90 whitespace-pre-wrap">
                  {JSON.stringify(parsedData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

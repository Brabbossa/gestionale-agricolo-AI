"use client";
import { Package, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Order = { id: string; plantName: string; quantity: number; status: string; createdAt: string };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DA_ORDINARE: { label: "Da Ordinare", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  IN_ORDINE:   { label: "In Ordine",   color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  RICEVUTO:    { label: "Ricevuto",    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

export default function OrdiniPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from('Order').select('*').order('createdAt', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('Order').update({ status }).eq('id', id);
    fetchOrders();
  };

  return (
    <div className="p-6 md:p-10 w-full max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <Package className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Ordini di Acquisto</h1>
        </div>
        <button onClick={fetchOrders} className="p-2 text-slate-400 hover:text-emerald-400 transition-colors" title="Aggiorna">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <p className="text-slate-400 text-sm -mt-4">
        Dì all'assistente vocale <span className="text-emerald-400 font-medium">"bisogna ordinare X [pianta]"</span> per aggiungere un ordine.
      </p>

      <div className="space-y-3">
        {loading ? (
          <div className="glass-card flex items-center justify-center h-40 text-slate-500">Caricamento...</div>
        ) : orders.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center h-40 gap-2 text-slate-500">
            <Package className="w-10 h-10 opacity-30" />
            <p>Nessun ordine. Usa l'assistente vocale per crearne uno.</p>
          </div>
        ) : orders.map(order => {
          const s = STATUS_LABEL[order.status] || STATUS_LABEL['DA_ORDINARE'];
          return (
            <div key={order.id} className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${s.color}`}>{s.label}</span>
                </div>
                <p className="font-semibold text-slate-100 text-lg">{order.plantName}</p>
                <p className="text-slate-400 text-sm">Qtà: <strong className="text-white">{order.quantity}</strong> pz &nbsp;·&nbsp; {new Date(order.createdAt).toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {order.status !== 'IN_ORDINE' && order.status !== 'RICEVUTO' && (
                  <button onClick={() => updateStatus(order.id, 'IN_ORDINE')} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm hover:bg-blue-500/20 transition-colors">Invia Ordine →</button>
                )}
                {order.status === 'IN_ORDINE' && (
                  <button onClick={() => updateStatus(order.id, 'RICEVUTO')} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm hover:bg-emerald-500/20 transition-colors">Segna Ricevuto ✓</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

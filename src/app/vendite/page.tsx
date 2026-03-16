"use client";
import { FileCheck, Plus, ShoppingCart, Truck, FileText, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function VenditePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // New Order State
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState("");
  const [cart, setCart] = useState<{ plantId: string; plantName: string; qty: number; price: number }[]>([]);
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    const [oRes, cRes, pRes] = await Promise.all([
      supabase.from('Ordini_Vendita').select('*, Anagrafica(ragione_sociale, partita_iva, indirizzo_sede), Voci_Ordine(*, Plant(name))').order('createdAt', { ascending: false }),
      supabase.from('Anagrafica').select('*').eq('tipo', 'Cliente').order('ragione_sociale'),
      supabase.from('Plant').select('*').gt('quantity', 0).order('name')
    ]);
    setOrders(oRes.data || []);
    setClients(cRes.data || []);
    setPlants(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const addToCart = () => {
    if (!selectedPlant || selectedQty <= 0) return;
    const plant = plants.find(p => p.id === selectedPlant);
    if (!plant) return;
    setCart([...cart, { plantId: plant.id, plantName: plant.name, qty: selectedQty, price: selectedPrice }]);
    setSelectedPlant(""); setSelectedQty(1); setSelectedPrice(0);
  };

  const createOrder = async () => {
    if (!selectedClient || cart.length === 0) return;
    const { data: order, error } = await supabase.from('Ordini_Vendita').insert({
      id_cliente: selectedClient,
      stato: 'Confermato'
    }).select().single();

    if (!error && order) {
      const voci = cart.map(item => ({
        id_ordine: order.id,
        id_lotto: item.plantId,
        quantita: item.qty,
        prezzo_unitario: item.price
      }));
      await supabase.from('Voci_Ordine').insert(voci);
      setModalOpen(false);
      setCart([]); setStep(1); setSelectedClient("");
      fetchAll();
    }
  };

  const markAsShipped = async (order: any) => {
    if (!confirm("Sei sicuro di voler spedire l'ordine e scalare le giacenze?")) return;
    
    // 1. Generate DDT Number
    const ddtNumber = `DDT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await supabase.from('Ordini_Vendita').update({ stato: 'Spedito', numero_ddt: ddtNumber }).eq('id', order.id);

    // 2. Inventory Deduction Logic
    for (const voce of order.Voci_Ordine) {
      const pId = voce.id_lotto;
      const q = voce.quantita;
      const { data: p } = await supabase.from('Plant').select('quantity').eq('id', pId).single();
      if (p) {
        // Subtract
        await supabase.from('Plant').update({ quantity: Math.max(0, p.quantity - q) }).eq('id', pId);
        // Log Movement
        await supabase.from('Movement').insert({
          plantId: pId, type: 'SCARICO', quantity: q, reason: `Vendita - ${ddtNumber}`,
        });
      }
    }
    fetchAll();
  };

  const generatePDF = (order: any) => {
    const doc = new jsPDF();
    const c = order.Anagrafica;
    
    // Header
    doc.setFontSize(20);
    doc.text("DOCUMENTO DI TRASPORTO (D.D.T.)", 14, 20);
    doc.setFontSize(10);
    doc.text("D.P.R. 472/96 - D.P.R. 696/96", 14, 26);
    
    // Mittente
    doc.setFontSize(12);
    doc.text("MITTENTE:", 14, 40);
    doc.setFontSize(10);
    doc.text("Nursery AI SRL\nVia delle Serre 1, 00100 Roma\nP.IVA: 12345678901", 14, 45);

    // Destinatario
    doc.setFontSize(12);
    doc.text("DESTINATARIO:", 120, 40);
    doc.setFontSize(10);
    doc.text(`${c.ragione_sociale}\n${c.indirizzo_sede || 'Indirizzo non specificato'}\nP.IVA: ${c.partita_iva}`, 120, 45);

    // Info Documento
    doc.setLineWidth(0.5);
    doc.line(14, 65, 196, 65);
    doc.text(`Numero DDT: ${order.numero_ddt || 'Bozza'}`, 14, 72);
    doc.text(`Data: ${new Date(order.data_ordine).toLocaleDateString('it-IT')}`, 120, 72);
    doc.line(14, 76, 196, 76);

    // Tabella Articoli
    const tableData = order.Voci_Ordine.map((v: any) => [
      v.Plant?.name || 'Articolo Ignoto',
      v.quantita.toString(),
      `€ ${v.prezzo_unitario.toFixed(2)}`,
      `€ ${(v.quantita * v.prezzo_unitario).toFixed(2)}`
    ]);

    (doc as any).autoTable({
      startY: 85,
      head: [['Descrizione Bene', 'Quantità', 'Prezzo Unit.', 'Importo']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });

    // Firme
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.text("Firma Conducente / Vettore", 30, finalY);
    doc.line(20, finalY + 10, 80, finalY + 10);
    
    doc.text("Firma Destinatario", 140, finalY);
    doc.line(130, finalY + 10, 190, finalY + 10);

    doc.save(`${order.numero_ddt || 'Ordine'}.pdf`);
  };

  return (
    <div className="p-6 md:p-10 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <FileCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Vendite e DDT</h1>
        </div>
        
        <button 
          onClick={() => { setStep(1); setModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition-colors flex items-center gap-2 px-4 shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Nuovo Ordine Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <p className="text-slate-500 col-span-2 text-center py-10">Caricamento ordini...</p>
        ) : orders.length === 0 ? (
          <div className="glass-card col-span-2 flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
            <ShoppingCart className="w-12 h-12 opacity-30" />
            <p>Nessun ordine di vendita creato.</p>
          </div>
        ) : orders.map(order => (
          <div key={order.id} className="glass-card flex flex-col justify-between border-t-4 border-t-emerald-500">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{order.Anagrafica?.ragione_sociale}</h3>
                  <p className="text-sm text-slate-400">{new Date(order.data_ordine).toLocaleString('it-IT')}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded ${order.stato === 'Spedito' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {order.stato}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Articoli:</p>
                {order.Voci_Ordine?.map((v: any) => (
                  <div key={v.id} className="flex justify-between text-sm bg-slate-800/50 p-2 rounded border border-slate-700/50">
                    <span className="text-slate-200">{v.quantita}x {v.Plant?.name}</span>
                    <span className="text-slate-400">€{(v.prezzo_unitario * v.quantita).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-700/50 flex flex-wrap gap-2 justify-end">
              {order.stato === 'Confermato' && (
                <button onClick={() => markAsShipped(order)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm flex items-center gap-2 transition">
                  <Truck className="w-4 h-4" /> Spedisci e Scala Giacenze
                </button>
              )}
              {order.stato === 'Spedito' && (
                <button onClick={() => generatePDF(order)} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm flex items-center gap-2 transition">
                  <FileText className="w-4 h-4" /> Scarica DDT PDF
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-100">Crea Ordine - Step {step}/2</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {step === 1 && (
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-400 block">Seleziona Cliente</label>
                  <select 
                    value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Scegli un cliente esistente --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale} ({c.partita_iva})</option>)}
                  </select>
                  {clients.length === 0 && <p className="text-xs text-orange-400">Nessun cliente in anagrafica. Aggiungine uno prima.</p>}
                  
                  <div className="pt-4 flex justify-end">
                    <button disabled={!selectedClient} onClick={() => setStep(2)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition disabled:opacity-50">Avanti →</button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {/* Cart preview */}
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2"><ShoppingCart className="w-4 h-4"/> Carrello ({cart.length})</h4>
                    {cart.map((c, i) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-700/50 last:border-0">
                        <span className="text-slate-200">{c.qty}x {c.plantName}</span>
                        <span className="text-slate-400">€{(c.price * c.qty).toFixed(2)}</span>
                      </div>
                    ))}
                    {cart.length === 0 && <p className="text-xs text-slate-500">Aggiungi vasi all'ordine</p>}
                  </div>

                  {/* Add item form */}
                  <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs font-semibold text-slate-400 block">Aggiungi Pianta dall'inventario</label>
                    <select value={selectedPlant} onChange={e => setSelectedPlant(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm">
                      <option value="">-- Scegli Vaso --</option>
                      {plants.map(p => <option key={p.id} value={p.id}>{p.name} (Disp: {p.quantity})</option>)}
                    </select>
                    <div className="flex gap-2">
                       <input type="number" min="1" value={selectedQty} onChange={e => setSelectedQty(Number(e.target.value))} placeholder="Qtà" className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm" />
                       <input type="number" step="0.5" min="0" value={selectedPrice} onChange={e => setSelectedPrice(Number(e.target.value))} placeholder="Prezzo €" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm" />
                       <button onClick={addToCart} className="px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"><Plus className="w-5 h-5"/></button>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-400 hover:text-slate-200">← Indietro</button>
                    <button onClick={createOrder} disabled={cart.length === 0} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Conferma Ordine
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

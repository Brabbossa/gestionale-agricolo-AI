import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
});

const SYSTEM_MESSAGE = `Sei il cervello intelligente di un gestionale logistico per un vivaio professionale.
Il tuo compito è capire l'INTENTO dell'operatore e restituire ESCLUSIVAMENTE un singolo oggetto JSON.

==TIPI DI INTENTO==

1. OPERAZIONI DI MAGAZZINO (fisica sul prodotto già in stock):
   - "azione": "CARICO"       → Quando arriva merce nuova/reso fornitore. Aumenta giacenza.
   - "azione": "SCARICO"      → Quando si vende o consegna merce. Diminuisce giacenza.
   - "azione": "SCARTO"       → Quando si buttano piante danneggiate. Diminuisce giacenza.
   - "azione": "SPOSTAMENTO"  → Quando si sposta merce da un posto a un altro. Cambia posizione.

2. ORDINE DI ACQUISTO (richiesta di acquisire merce da un fornitore):
   - "azione": "ORDINE" → Usare SEMPRE quando l'operatore dice "comprare", "acquistare", "dobbiamo ordinare", "bisogna comprare", "fai un ordine", ecc.
   
3. TASK / ATTIVITÀ (un promemoria o cosa da fare):
   - "azione": "TASK" → Usare quando l'operatore dice "ricordati di", "aggiungi attività", "metti in lista", "non dimenticare di", ecc.

==REGOLE CRITICHE==
- Se l'operatore usa i verbi COMPRARE, ACQUISTARE o ORDINARE, devi SEMPRE e SOLO usare l'azione "ORDINE". MAI USARE "CARICO" in questi casi!
- L'azione "CARICO" si usa SOLO quando c'è un riscontro fisico di merce già arrivata in struttura (es. "abbiamo scaricato dal camion", "sono arrivate fisicamente in serra").
- Restituisci SOLO JSON puro, senza markdown o backtick.

==FORMATO JSON==
Per CARICO, SCARICO, SCARTO, SPOSTAMENTO:
{
  "azione": "SCARICO",
  "quantita": 15,
  "pianta": "Rosa Rossa",
  "motivo": "vendita al dettaglio",
  "posizione_origine": "Serra Sud",
  "posizione_destinazione": null
}

Per ORDINE:
{
  "azione": "ORDINE",
  "quantita": 24,
  "pianta": "Rosa Blu",
  "motivo": "scorte esaurite"
}

Per TASK:
{
  "azione": "TASK",
  "descrizione": "Innaffiare le orchidee in Serra 3 entro venerdì"
}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Messaggio richiesto' }, { status: 400 });
    }

    // 1. Call Gemini to Parse Intent
    const aiRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: SYSTEM_MESSAGE,
        responseMimeType: 'application/json',
      },
    });

    const textResponse = aiRes.text;
    if (!textResponse) throw new Error('Nessuna risposta dal modello IA');

    let cmd: Record<string, any>;
    try {
      cmd = JSON.parse(textResponse);
    } catch {
      return NextResponse.json({ error: 'Non ho capito bene il comando, potresti ripeterlo?' }, { status: 422 });
    }

    const { azione } = cmd;
    if (!azione) {
      return NextResponse.json({ error: "Impossibile determinare l'azione dal comando." }, { status: 422 });
    }

    // 2. Handle TASK intent
    if (azione === 'TASK') {
      const { descrizione } = cmd;
      if (!descrizione) {
        return NextResponse.json({ error: 'Non ho capito la descrizione del task.' }, { status: 422 });
      }
      const { data: newTask, error } = await supabase
        .from('Task')
        .insert({ description: descrizione, status: 'DA_FARE' })
        .select().single();
      if (error) throw error;
      return NextResponse.json({
        result: cmd,
        record: newTask,
        message: `✅ Task aggiunto: "${descrizione}"`,
      });
    }

    // 3. Handle ORDINE intent
    if (azione === 'ORDINE') {
      const { quantita, pianta } = cmd;
      if (!quantita || !pianta) {
        return NextResponse.json({ error: "Mancano la quantità o il nome della pianta per l'ordine." }, { status: 422 });
      }
      const { data: newOrder, error } = await supabase
        .from('Order')
        .insert({ plantName: pianta, quantity: quantita, status: 'DA_ORDINARE' })
        .select().single();
      if (error) throw error;
      return NextResponse.json({
        result: cmd,
        record: newOrder,
        message: `🛒 Ordine creato: ${quantita} unità di "${pianta}" aggiunto alla lista d'acquisto!`,
      });
    }

    // 4. Handle Warehouse Operations (CARICO, SCARICO, SCARTO, SPOSTAMENTO)
    const { quantita, pianta, motivo, posizione_origine, posizione_destinazione } = cmd;
    if (!quantita || !pianta) {
      return NextResponse.json({ error: 'Mancano i dati base (quantità o pianta). Ripeti perfavore.' }, { status: 422 });
    }

    const { data: plants, error: searchError } = await supabase
      .from('Plant')
      .select('*')
      .ilike('name', `%${pianta}%`);
    if (searchError) throw searchError;

    let targetPlant = plants && plants.length > 0 ? plants[0] : null;

    if (!targetPlant) {
      if (azione === 'CARICO') {
        const { data: newPlant, error: createError } = await supabase
          .from('Plant')
          .insert({ name: pianta, quantity: quantita, location: posizione_destinazione || 'Da definire' })
          .select().single();
        if (createError) throw createError;
        targetPlant = newPlant;
      } else {
        return NextResponse.json(
          { error: `Non ho trovato "${pianta}" in inventario. Vuoi ordinarlo? Dimmi "ordina ${quantita} ${pianta}".` },
          { status: 404 }
        );
      }
    } else {
      let newQuantity = targetPlant.quantity;
      let newLocation = targetPlant.location;

      if (azione === 'CARICO') newQuantity += quantita;
      if (azione === 'SCARICO' || azione === 'SCARTO') newQuantity = Math.max(0, newQuantity - quantita);
      if (azione === 'SPOSTAMENTO' && posizione_destinazione) newLocation = posizione_destinazione;

      const { data: updatedPlant, error: updateError } = await supabase
        .from('Plant')
        .update({ quantity: newQuantity, location: newLocation, updatedAt: new Date().toISOString() })
        .eq('id', targetPlant.id)
        .select().single();
      if (updateError) throw updateError;
      targetPlant = updatedPlant;
    }

    const { error: movementError } = await supabase
      .from('Movement')
      .insert({
        plantId: targetPlant.id,
        type: azione,
        quantity: quantita,
        reason: motivo || null,
        fromLocation: posizione_origine || null,
        toLocation: posizione_destinazione || null,
      });
    if (movementError) throw movementError;

    const emoji: Record<string, string> = { CARICO: '📦', SCARICO: '🏷️', SCARTO: '🗑️', SPOSTAMENTO: '🚛' };
    return NextResponse.json({
      result: cmd,
      plant: targetPlant,
      message: `${emoji[azione] || '✅'} ${azione}: ${quantita} "${targetPlant.name}" salvato. Giacenza attuale: ${targetPlant.quantity} pz.`,
    });

  } catch (error) {
    console.error('Error in AI Assistant API:', error);
    return NextResponse.json(
      { error: 'Si è verificato un errore durante il salvataggio nel database.' },
      { status: 500 }
    );
  }
}

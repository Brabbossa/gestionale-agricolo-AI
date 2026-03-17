import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
});

const SYSTEM_MESSAGE = `Sei il cervello intelligente di un gestionale logistico per un vivaio professionale.
Il tuo compito e' capire l'INTENTO dell'operatore e restituire ESCLUSIVAMENTE un singolo oggetto JSON valido.
Non aggiungere mai spiegazioni, testo, markdown o commenti al di fuori del JSON.

==TIPI DI INTENTO==

1. OPERAZIONI DI MAGAZZINO (merce fisicamente presente in struttura):
   - "azione": "CARICO"       -> Merce fisicamente arrivata (es. "scaricata dal camion", "sono arrivate")
   - "azione": "SCARICO"      -> Vendita o consegna di merce
   - "azione": "SCARTO"       -> Piante danneggiate da buttare
   - "azione": "SPOSTAMENTO"  -> Cambio posizione fisica in magazzino

2. ORDINE DI ACQUISTO (acquisire da fornitore):
   - "azione": "ORDINE" -> Parole chiave: "comprare", "acquistare", "ordinare", "bisogna comprare", "fai un ordine"

3. TASK / ATTIVITA':
   - "azione": "TASK" -> Parole chiave: "ricordati", "aggiungi attivita'", "metti in lista", "non dimenticare"

4. ELIMINAZIONE DI UN SINGOLO RECORD:
   - "azione": "ELIMINA"
   - "target_type": uno tra "TASK", "ORDINE", "PIANTA"
   - "criterio": parola chiave da cercare
   - Usare quando l'operatore dice: "cancella", "elimina", "rimuovi", "togli", "annulla"
   - Esempio: "cancella il task delle orchidee" -> { "azione": "ELIMINA", "target_type": "TASK", "criterio": "orchidee" }

5. ELIMINAZIONE MASSIVA (cancellare tutti i dati di un tipo):
   - "azione": "ELIMINA_TUTTO"
   - "target_types": array con uno o piu' tra "TASK", "ORDINI", "PIANTE"
   - Usare quando si dice: "elimina tutto", "cancella tutti gli ordini", "svuota l'inventario", "azzera le task"
   - Esempio: "cancella tutti gli ordini e tutte le task" -> { "azione": "ELIMINA_TUTTO", "target_types": ["ORDINI", "TASK"] }
   - Esempio: "elimina tutto" -> { "azione": "ELIMINA_TUTTO", "target_types": ["TASK", "ORDINI", "PIANTE"] }
   - Esempio: "svuota l'inventario" -> { "azione": "ELIMINA_TUTTO", "target_types": ["PIANTE"] }

==REGOLE CRITICHE==
- COMPRARE / ACQUISTARE / ORDINARE -> SEMPRE "ORDINE", MAI "CARICO".
- "CARICO" solo se la merce e' fisicamente arrivata in struttura.
- Se il comando usa "tutto", "tutti", "ogni", "azzerare" -> usa ELIMINA_TUTTO.
- Se il comando menziona qualcosa di specifico -> usa ELIMINA con criterio.
- Restituisci SOLO JSON puro, zero testo extra.`;

// Log every command to the Chat_History table
async function logToHistory(user_message: string, ai_response: string, azione: string, success: boolean) {
  await supabase.from('Chat_History').insert({ user_message, ai_response, azione, success });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { message } = body;

  if (!message) {
    return NextResponse.json({ error: 'Messaggio richiesto' }, { status: 400 });
  }

  let cmd: Record<string, any> = {};

  try {
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

    try {
      cmd = JSON.parse(textResponse);
    } catch {
      await logToHistory(message, 'Parsing JSON error', 'UNKNOWN', false);
      return NextResponse.json({ error: 'Non ho capito il comando, puoi ripeterlo?' }, { status: 422 });
    }

    const { azione } = cmd;
    if (!azione) {
      await logToHistory(message, 'No azione found', 'UNKNOWN', false);
      return NextResponse.json({ error: "Impossibile determinare l'azione dal comando." }, { status: 422 });
    }

    // ── TASK ──────────────────────────────────────────────────────────────────
    if (azione === 'TASK') {
      const { descrizione } = cmd;
      if (!descrizione) return NextResponse.json({ error: 'Non ho capito il task.' }, { status: 422 });
      const { data: newTask, error } = await supabase.from('Task').insert({ description: descrizione, status: 'DA_FARE' }).select().single();
      if (error) throw error;
      const msg = `📋 Task aggiunto: "${descrizione}"`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, record: newTask, message: msg });
    }

    // ── ORDINE ────────────────────────────────────────────────────────────────
    if (azione === 'ORDINE') {
      const { quantita, pianta } = cmd;
      if (!quantita || !pianta) return NextResponse.json({ error: "Mancano dati per l'ordine." }, { status: 422 });
      const { data: newOrder, error } = await supabase.from('Order').insert({ plantName: pianta, quantity: quantita, status: 'DA_ORDINARE' }).select().single();
      if (error) throw error;
      const msg = `🛒 Ordine creato: ${quantita} x "${pianta}"`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, record: newOrder, message: msg });
    }

    // ── ELIMINA (single record) ───────────────────────────────────────────────
    if (azione === 'ELIMINA') {
      const { target_type, criterio } = cmd;
      if (!target_type || !criterio) return NextResponse.json({ error: 'Specifica cosa eliminare.' }, { status: 422 });

      let deletedMsg = '';
      let found = false;

      if (target_type === 'TASK') {
        const { data: tasks } = await supabase.from('Task').select('id, description').ilike('description', `%${criterio}%`);
        if (tasks && tasks.length > 0) {
          await supabase.from('Task').delete().eq('id', tasks[0].id);
          deletedMsg = `🗑️ Task eliminato: "${tasks[0].description}"`;
          found = true;
        }
      } else if (target_type === 'ORDINE') {
        const { data: orders } = await supabase.from('Order').select('id, plantName, quantity').ilike('plantName', `%${criterio}%`);
        if (orders && orders.length > 0) {
          await supabase.from('Order').delete().eq('id', orders[0].id);
          deletedMsg = `🗑️ Ordine eliminato: ${orders[0].quantity} x "${orders[0].plantName}"`;
          found = true;
        }
      } else if (target_type === 'PIANTA') {
        const { data: plants } = await supabase.from('Plant').select('id, name, quantity').ilike('name', `%${criterio}%`);
        if (plants && plants.length > 0) {
          await supabase.from('Plant').delete().eq('id', plants[0].id);
          deletedMsg = `🗑️ Pianta eliminata: "${plants[0].name}"`;
          found = true;
        }
      }

      if (!found) {
        const msg = `⚠️ Nessun record trovato con: "${criterio}"`;
        await logToHistory(message, msg, azione, false);
        return NextResponse.json({ message: msg }, { status: 404 });
      }

      await logToHistory(message, deletedMsg, azione, true);
      return NextResponse.json({ result: cmd, message: deletedMsg });
    }

    // ── ELIMINA_TUTTO (bulk delete) ───────────────────────────────────────────
    if (azione === 'ELIMINA_TUTTO') {
      const { target_types } = cmd;
      if (!target_types || !Array.isArray(target_types) || target_types.length === 0) {
        return NextResponse.json({ error: 'Specifica cosa eliminare (es. TASK, ORDINI, PIANTE).' }, { status: 422 });
      }

      const results: string[] = [];

      if (target_types.includes('TASK')) {
        const { count } = await supabase.from('Task').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('*', { count: 'exact', head: true });
        results.push(`📋 Task: ${count ?? 'tutti'} eliminati`);
      }
      if (target_types.includes('ORDINI')) {
        const { count } = await supabase.from('Order').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('*', { count: 'exact', head: true });
        results.push(`🛒 Ordini: ${count ?? 'tutti'} eliminati`);
      }
      if (target_types.includes('PIANTE')) {
        const { count } = await supabase.from('Plant').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('*', { count: 'exact', head: true });
        results.push(`🌱 Piante: ${count ?? 'tutte'} eliminate`);
      }

      const msg = `🗑️ Eliminazione massiva completata:\n${results.join('\n')}`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, message: msg });
    }

    // ── WAREHOUSE OPERATIONS ──────────────────────────────────────────────────
    const { quantita, pianta, motivo, posizione_origine, posizione_destinazione } = cmd;
    if (!quantita || !pianta) {
      return NextResponse.json({ error: 'Mancano quantità o pianta. Ripeti perfavore.' }, { status: 422 });
    }

    const { data: plants, error: searchError } = await supabase.from('Plant').select('*').ilike('name', `%${pianta}%`);
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
        const msg = `⚠️ Non ho trovato "${pianta}" in inventario.`;
        await logToHistory(message, msg, azione, false);
        return NextResponse.json({ error: msg }, { status: 404 });
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

    const { error: movementError } = await supabase.from('Movement').insert({
      plantId: targetPlant.id,
      type: azione,
      quantity: quantita,
      reason: motivo || null,
      fromLocation: posizione_origine || null,
      toLocation: posizione_destinazione || null,
    });
    if (movementError) throw movementError;

    const emoji: Record<string, string> = { CARICO: '📦', SCARICO: '🏷️', SCARTO: '🗑️', SPOSTAMENTO: '🚛' };
    const msg = `${emoji[azione] || '✅'} ${azione}: ${quantita} "${targetPlant.name}" — Giacenza: ${targetPlant.quantity} pz.`;
    await logToHistory(message, msg, azione, true);
    return NextResponse.json({ result: cmd, plant: targetPlant, message: msg });

  } catch (error) {
    console.error('Error in AI Assistant API:', error);
    await logToHistory(message, 'Internal server error', cmd?.azione || 'UNKNOWN', false);
    return NextResponse.json({ error: 'Si e\' verificato un errore durante il salvataggio nel database.' }, { status: 500 });
  }
}

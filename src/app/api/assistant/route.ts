import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SYSTEM_MESSAGE = `Sei l'interprete vocale intelligente di un gestionale agricolo per vivai.
L'utente parla e tu restituisci ESCLUSIVAMENTE UN JSON, senza markdown, senza testo extra.

Azioni che puoi riconoscere:
1. "CREA_ZONA": L'utente vuole aggiungere un settore/zona/serra/tunnel.
   Esempio: "Aggiungi la Serra A" -> { "azione": "CREA_ZONA", "nome_zona": "Serra A", "tipo": "Serra" }
   Esempio: "Crea una zona chiamata Tunnel 2" -> { "azione": "CREA_ZONA", "nome_zona": "Tunnel 2", "tipo": "Tunnel" }
   Esempio: "Aggiungi il piazzale" -> { "azione": "CREA_ZONA", "nome_zona": "Piazzale", "tipo": "Campo Aperto" }

2. "CARICO": L'utente carica/aggiunge piante fisicamente in una zona.
   Esempio: "Ho messo 50 rose nella Serra A" -> { "azione": "CARICO", "quantita": 50, "pianta": "rose", "destinazione": "Serra A" }
   Esempio: "Sono arrivati 100 tulipani rossi alla serra 1" -> { "azione": "CARICO", "quantita": 100, "pianta": "tulipani rossi", "destinazione": "Serra 1" }

3. "SCARICO": L'utente vende/consegna piante da una zona.
   Esempio: "Vendi 20 rose dalla Serra A" -> { "azione": "SCARICO", "quantita": 20, "pianta": "rose", "destinazione": "Serra A" }

4. "SCARTO": L'utente butta/scarta piante danneggiate.
   Esempio: "Butta 10 gerani dalla Serra B" -> { "azione": "SCARTO", "quantita": 10, "pianta": "gerani", "destinazione": "Serra B" }

5. "SPOSTAMENTO": L'utente sposta piante da una zona ad un'altra.
   Esempio: "Sposta 30 rose dalla Serra A al Tunnel 2" -> { "azione": "SPOSTAMENTO", "quantita": 30, "pianta": "rose", "origine": "Serra A", "destinazione": "Tunnel 2" }

6. "ELIMINA": Azione distruttiva (cancellare un lotto o una zona).
   Esempio: "Elimina tutti i tulipani dalla Serra 1" -> { "azione": "ELIMINA", "pianta": "tulipani", "destinazione": "Serra 1" }
   Esempio: "Elimina la Serra 3" -> { "azione": "ELIMINA", "nome_zona": "Serra 3" }

7. "STATO_SALUTE": Aggiornamento stato di salute di un lotto.
   Esempio: "Le rose nella Serra A sono in emergenza" -> { "azione": "STATO_SALUTE", "pianta": "rose", "destinazione": "Serra A", "stato": "Emergenza" }
   * stati possibili: "Ottimo", "Attenzione", "Emergenza"

8. "CREA_TASK": L'utente chiede di ricordargli qualcosa o crea una nuova attività/promemoria.
   Esempio: "Ricordati di innaffiare i bonsai" -> { "azione": "CREA_TASK", "titolo": "Innaffiare i bonsai" }
   Esempio: "Aggiungi un task per domani: potare le rose" -> { "azione": "CREA_TASK", "titolo": "Potare le rose" }

==REGOLE==
- Restituisci SOLO JSON puro.
- "quantita" deve essere un numero intero.
- "pianta", "destinazione" e "titolo" devono essere stringhe.`;

// Utility: log to Chat_History
async function logToHistory(user_message: string, ai_response: string, azione: string, success: boolean) {
  await supabase.from('Chat_History').insert({ user_message, ai_response, azione, success });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { message, pendingCmd } = body;

  if (!message) {
    return NextResponse.json({ error: 'Messaggio richiesto' }, { status: 400 });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("LA CHIAVE API NON E' CARICATA IN MEMORIA. DEVI FORZARE IL RIAVVIO DEL TERMINALE CON CTRL+C E POI SCRIVERE NPM RUN DEV.");
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY as string,
    });

    // ──────────────────────────────────────────────────────────────
    // 1) GESTIONE CONFERMA PRECEDENTE (Sicurezza comandi distruttivi)
    // ──────────────────────────────────────────────────────────────
    if (pendingCmd && pendingCmd.azione === 'ELIMINA') {
      const msgLower = message.toLowerCase().trim();
      const isYes = ['si', 'sì', 'certo', 'confermo', 'ok', 'procedi', 'vai', 'esatto'].some(w => msgLower.includes(w));
      const isNo = ['no', 'annulla', 'fermati', 'sbagliato', 'stop', 'niente'].some(w => msgLower.includes(w));

      if (isNo) {
        const msg = '❌ Operazione annullata.';
        await logToHistory(message, msg, 'ANNULLATO', true);
        return NextResponse.json({ result: { azione: 'ANNULLATO' }, message: msg });
      }

      if (isYes) {
        // ESEGUI ELIMINAZIONE confermata
        const cmd = pendingCmd;
        
        if (cmd.nome_zona && !cmd.pianta) {
          // Eliminazione di una zona intera
          const { data: locs } = await supabase.from('locations').select('id, nome_zona').ilike('nome_zona', `%${cmd.nome_zona}%`);
          if (locs && locs.length > 0) {
            // inventory_lotti cascaderà grazie al ON DELETE CASCADE
            await supabase.from('locations').delete().eq('id', locs[0].id);
            const msg = `🗑️ Zona "${locs[0].nome_zona}" eliminata con tutti i lotti.`;
            await logToHistory(message, msg, 'ELIMINA', true);
            return NextResponse.json({ result: cmd, message: msg });
          }
          const msg = `⚠️ Zona "${cmd.nome_zona}" non trovata.`;
          await logToHistory(message, msg, 'ELIMINA', false);
          return NextResponse.json({ error: msg }, { status: 404 });
        }

        if (cmd.pianta && cmd.destinazione) {
          // Eliminazione di un lotto specifico da una zona
          const { data: locs } = await supabase.from('locations').select('id, nome_zona').ilike('nome_zona', `%${cmd.destinazione}%`);
          if (locs && locs.length > 0) {
            const { data: lotto } = await supabase.from('inventory_lotti').select('*').eq('location_id', locs[0].id).ilike('nome_pianta', `%${cmd.pianta}%`);
            if (lotto && lotto.length > 0) {
              await supabase.from('inventory_lotti').delete().eq('id', lotto[0].id);
              const msg = `🗑️ Lotto "${lotto[0].nome_pianta}" eliminato da ${locs[0].nome_zona}.`;
              await logToHistory(message, msg, 'ELIMINA', true);
              return NextResponse.json({ result: cmd, message: msg });
            }
          }
          const msg = `⚠️ Lotto o zona non trovati.`;
          await logToHistory(message, msg, 'ELIMINA', false);
          return NextResponse.json({ error: msg }, { status: 404 });
        }

        return NextResponse.json({ error: 'Impossibile individuare cosa eliminare.' }, { status: 422 });
      }

      // Se non capisce ne si ne no
      return NextResponse.json({ error: 'Rispondi "Sì" o "No" per confermare l\'eliminazione.' }, { status: 422 });
    }

    // ──────────────────────────────────────────────────────────────
    // 2) PARSING DAL MODELLO AI
    // ──────────────────────────────────────────────────────────────
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
      await logToHistory(message, 'Parsing JSON error', 'UNKNOWN', false);
      return NextResponse.json({ error: 'Non ho capito il comando, puoi ripeterlo?' }, { status: 422 });
    }

    const { azione } = cmd;
    if (!azione) {
      await logToHistory(message, 'No azione found', 'UNKNOWN', false);
      return NextResponse.json({ error: "Impossibile determinare l'azione." }, { status: 422 });
    }

    // ──────────────────────────────────────────────────────────────
    // 3) ELIMINA — richiede conferma (non esegue subito)
    // ──────────────────────────────────────────────────────────────
    if (azione === 'ELIMINA') {
      const target = cmd.pianta ? `i ${cmd.pianta}` : `la zona "${cmd.nome_zona}"`;
      const from = cmd.destinazione ? ` da ${cmd.destinazione}` : '';
      return NextResponse.json({
        needs_confirmation: true,
        pendingCmd: cmd,
        message: `⚠️ Vuoi davvero ELIMINARE ${target}${from}? Rispondi "Sì" o "No".`,
      });
    }

    // ──────────────────────────────────────────────────────────────
    // 4) CREA_ZONA
    // ──────────────────────────────────────────────────────────────
    if (azione === 'CREA_ZONA') {
      if (!cmd.nome_zona) {
        return NextResponse.json({ error: 'Specifica il nome della zona.' }, { status: 422 });
      }
      // Check duplicato
      const { data: existing } = await supabase.from('locations').select('id').ilike('nome_zona', cmd.nome_zona);
      if (existing && existing.length > 0) {
        const msg = `ℹ️ La zona "${cmd.nome_zona}" esiste già.`;
        await logToHistory(message, msg, azione, true);
        return NextResponse.json({ result: cmd, message: msg });
      }

      const { data: newLoc, error } = await supabase.from('locations').insert({ nome_zona: cmd.nome_zona, tipo: cmd.tipo || 'Generica' }).select().single();
      if (error) throw error;
      const msg = `✅ Zona "${cmd.nome_zona}" creata con successo.`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, record: newLoc, message: msg });
    }

    // ──────────────────────────────────────────────────────────────
    // 5) CARICO
    // ──────────────────────────────────────────────────────────────
    if (azione === 'CARICO') {
      if (!cmd.pianta || !cmd.quantita) {
        return NextResponse.json({ error: 'Specifica pianta e quantità.' }, { status: 422 });
      }
      if (!cmd.destinazione) {
        return NextResponse.json({ error: 'Specifica la zona di destinazione.' }, { status: 422 });
      }

      // Find or create location
      let locId: string | null = null;
      const { data: locs } = await supabase.from('locations').select('id, nome_zona').ilike('nome_zona', `%${cmd.destinazione}%`);
      if (locs && locs.length > 0) {
        locId = locs[0].id;
      } else {
        // Auto-create location
        const { data: newLoc } = await supabase.from('locations').insert({ nome_zona: cmd.destinazione, tipo: 'Generica' }).select().single();
        if (newLoc) locId = newLoc.id;
      }

      if (!locId) {
        return NextResponse.json({ error: 'Non sono riuscito a trovare o creare la zona.' }, { status: 500 });
      }

      // Find existing lotto or create new one
      const { data: lottoExisting } = await supabase.from('inventory_lotti').select('*').eq('location_id', locId).ilike('nome_pianta', `%${cmd.pianta}%`);
      if (lottoExisting && lottoExisting.length > 0) {
        const newQty = lottoExisting[0].quantita + cmd.quantita;
        await supabase.from('inventory_lotti').update({ quantita: newQty, updated_at: new Date().toISOString() }).eq('id', lottoExisting[0].id);
      } else {
        await supabase.from('inventory_lotti').insert({ location_id: locId, nome_pianta: cmd.pianta, quantita: cmd.quantita });
      }

      const msg = `📦 Aggiunti ${cmd.quantita} "${cmd.pianta}" in ${cmd.destinazione}.`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, message: msg });
    }

    // ──────────────────────────────────────────────────────────────
    // 6) SCARICO / SCARTO
    // ──────────────────────────────────────────────────────────────
    if (azione === 'SCARICO' || azione === 'SCARTO') {
      if (!cmd.pianta || !cmd.quantita) {
        return NextResponse.json({ error: 'Specifica pianta e quantità.' }, { status: 422 });
      }
      const targetZona = cmd.destinazione || cmd.origine;
      if (!targetZona) {
        return NextResponse.json({ error: 'Specifica la zona.' }, { status: 422 });
      }

      const { data: locs } = await supabase.from('locations').select('id, nome_zona').ilike('nome_zona', `%${targetZona}%`);
      if (!locs || locs.length === 0) {
        const msg = `⚠️ Zona "${targetZona}" non trovata.`;
        await logToHistory(message, msg, azione, false);
        return NextResponse.json({ error: msg }, { status: 404 });
      }

      const { data: lotto } = await supabase.from('inventory_lotti').select('*').eq('location_id', locs[0].id).ilike('nome_pianta', `%${cmd.pianta}%`);
      if (!lotto || lotto.length === 0) {
        const msg = `⚠️ Lotto "${cmd.pianta}" non trovato in ${locs[0].nome_zona}.`;
        await logToHistory(message, msg, azione, false);
        return NextResponse.json({ error: msg }, { status: 404 });
      }

      const newQty = Math.max(0, lotto[0].quantita - cmd.quantita);
      if (newQty === 0) {
        await supabase.from('inventory_lotti').delete().eq('id', lotto[0].id);
      } else {
        await supabase.from('inventory_lotti').update({ quantita: newQty, updated_at: new Date().toISOString() }).eq('id', lotto[0].id);
      }

      const verb = azione === 'SCARTO' ? 'Scartati' : 'Scaricati';
      const msg = `🏷️ ${verb} ${cmd.quantita} "${cmd.pianta}" da ${locs[0].nome_zona}. Rimanenti: ${newQty}.`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, message: msg });
    }

    // ──────────────────────────────────────────────────────────────
    // 7) SPOSTAMENTO
    // ──────────────────────────────────────────────────────────────
    if (azione === 'SPOSTAMENTO') {
      if (!cmd.pianta || !cmd.quantita || !cmd.origine || !cmd.destinazione) {
        return NextResponse.json({ error: 'Specifica pianta, quantità, zona di origine e di destinazione.' }, { status: 422 });
      }

      // Find origin location
      const { data: origLocs } = await supabase.from('locations').select('id, nome_zona').ilike('nome_zona', `%${cmd.origine}%`);
      if (!origLocs || origLocs.length === 0) {
        return NextResponse.json({ error: `Zona di origine "${cmd.origine}" non trovata.` }, { status: 404 });
      }

      // Find origin lotto
      const { data: origLotto } = await supabase.from('inventory_lotti').select('*').eq('location_id', origLocs[0].id).ilike('nome_pianta', `%${cmd.pianta}%`);
      if (!origLotto || origLotto.length === 0) {
        return NextResponse.json({ error: `"${cmd.pianta}" non trovato in ${origLocs[0].nome_zona}.` }, { status: 404 });
      }

      if (origLotto[0].quantita < cmd.quantita) {
        return NextResponse.json({ error: `Quantità insufficiente: hai solo ${origLotto[0].quantita} "${cmd.pianta}" in ${origLocs[0].nome_zona}.` }, { status: 422 });
      }

      // Find or create destination location
      let destLocId: string | null = null;
      const { data: destLocs } = await supabase.from('locations').select('id, nome_zona').ilike('nome_zona', `%${cmd.destinazione}%`);
      if (destLocs && destLocs.length > 0) {
        destLocId = destLocs[0].id;
      } else {
        const { data: newLoc } = await supabase.from('locations').insert({ nome_zona: cmd.destinazione, tipo: 'Generica' }).select().single();
        if (newLoc) destLocId = newLoc.id;
      }
      if (!destLocId) return NextResponse.json({ error: 'Impossibile creare/trovare la zona di destinazione.' }, { status: 500 });

      // Decrement origin
      const newOrigQty = origLotto[0].quantita - cmd.quantita;
      if (newOrigQty === 0) {
        await supabase.from('inventory_lotti').delete().eq('id', origLotto[0].id);
      } else {
        await supabase.from('inventory_lotti').update({ quantita: newOrigQty }).eq('id', origLotto[0].id);
      }

      // Increment destination
      const { data: destLotto } = await supabase.from('inventory_lotti').select('*').eq('location_id', destLocId).ilike('nome_pianta', `%${cmd.pianta}%`);
      if (destLotto && destLotto.length > 0) {
        await supabase.from('inventory_lotti').update({ quantita: destLotto[0].quantita + cmd.quantita }).eq('id', destLotto[0].id);
      } else {
        await supabase.from('inventory_lotti').insert({ location_id: destLocId, nome_pianta: cmd.pianta, quantita: cmd.quantita });
      }

      const msg = `🚛 Spostati ${cmd.quantita} "${cmd.pianta}" da ${origLocs[0].nome_zona} a ${cmd.destinazione}.`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, message: msg });
    }

    // ──────────────────────────────────────────────────────────────
    // 8) STATO_SALUTE
    // ──────────────────────────────────────────────────────────────
    if (azione === 'STATO_SALUTE') {
      if (!cmd.pianta || !cmd.destinazione || !cmd.stato) {
        return NextResponse.json({ error: 'Specifica pianta, zona e stato.' }, { status: 422 });
      }

      const { data: locs } = await supabase.from('locations').select('id, nome_zona').ilike('nome_zona', `%${cmd.destinazione}%`);
      if (!locs || locs.length === 0) {
        return NextResponse.json({ error: `Zona "${cmd.destinazione}" non trovata.` }, { status: 404 });
      }

      const { data: lotto } = await supabase.from('inventory_lotti').select('*').eq('location_id', locs[0].id).ilike('nome_pianta', `%${cmd.pianta}%`);
      if (!lotto || lotto.length === 0) {
        return NextResponse.json({ error: `"${cmd.pianta}" non trovato in ${locs[0].nome_zona}.` }, { status: 404 });
      }

      await supabase.from('inventory_lotti').update({ stato_salute: cmd.stato, updated_at: new Date().toISOString() }).eq('id', lotto[0].id);
      const msg = `🩺 Stato di "${lotto[0].nome_pianta}" in ${locs[0].nome_zona} aggiornato a: ${cmd.stato}.`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, message: msg });
    }

    // ──────────────────────────────────────────────────────────────
    // 9) CREA_TASK
    // ──────────────────────────────────────────────────────────────
    if (azione === 'CREA_TASK') {
      if (!cmd.titolo) {
        return NextResponse.json({ error: 'Specifica il titolo o la descrizione del promemoria.' }, { status: 422 });
      }

      const { data: newTask, error } = await supabase.from('Task').insert({ 
        titolo: cmd.titolo, 
        status: 'Da fare' 
      }).select().single();

      if (error) throw error;
      const msg = `✅ Promemoria salvato: "${cmd.titolo}".`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, record: newTask, message: msg });
    }

    // ──────────────────────────────────────────────────────────────
    // Fallback: azione non riconosciuta
    // ──────────────────────────────────────────────────────────────
    const msg = `ℹ️ Comando ricevuto (${azione}) ma non gestito per le nuove tabelle.`;
    await logToHistory(message, msg, azione, false);
    return NextResponse.json({ result: cmd, message: msg });

  } catch (error: any) {
    console.error('Error in AI Assistant API:', error);
    await logToHistory(message, error.message || 'Internal error', 'UNKNOWN', false);
    return NextResponse.json({ error: "Debug - Errore server: " + (error.message || 'Sconosciuto') }, { status: 500 });
  }
}

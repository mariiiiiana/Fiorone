# piano di implementazione del progetto 

 Userai un'applicazione web che aiuta i membri della famiglia a riflettere sui malintesi reciproci causati da problemi di interpretazione e comunicazione, oltre che dai divari generazionali. 

## meccaniche principali 
All'inizio vieni accolto in una fase di raccolta dati, che serve a posizionarti all'interno del sistema familiare. Questo passaggio crea una sorta di “mappa” della famiglia: non solo chi sei, ma anche la prospettiva generazionale da cui osservi le cose.
Se partecipano più persone, ciascuna entra separatamente e compila il proprio profilo. In questo modo, le risposte restano individuali e non vengono influenzate direttamente dagli altri.
Dopo la fase di profilazione, l'esperienza entra nel cuore del processo con tre domande sulla dinamica relazionale.

## flusso di interazione
AVVIO
l'utente visualizza una schermata introduttiva

All'utente viene mostrata l'informativa sulla privacy 
[“accetto”]
├─ Sì → l'interazione inizia
└─ No → l'interazione termina 

Primo profilo utente

3 domande di riflessione

Salva in memoria
↓
[
"aggiungi"?
]
├─ Sì → Nuova profilazione → 3 domande → Salva → ripeti
└─ No

["siamo pronti"?]
├─ No → attendi un nuovo membro / continua la raccolta dati
└─ Sì

Analisi delle risposte

Mappatura su:
- emozioni di base
- emozioni derivate
- stati mentali
- bisogni relazionali

Confronto con altri gruppi familiari

Creazione dell'interfaccia visiva

Generazione di 4 grafici radar (1 per membro)

Domanda finale di feedback

Riavvio / "ricomincia"

FINE

## guida all'implementazione
Struttura del sistema
Dividi il sistema in tre moduli principali:
* Modulo di input → gestisce la profilazione dell'utente e le risposte
* Modulo di elaborazione → analizza e codifica i dati
* Modulo di output → genera visualizzazioni e feedback

2. Flusso di input (logica frontend)
* Crea un'interfaccia guidata passo per passo:
    1. Modulo di profilazione (ruolo, generazione, ruolo familiare)
    2. 3 domande a risposta aperta
* Aggiungi i trigger:
    * “aggiungi” → riavvia il flusso per un nuovo utente
    * “siamo pronti” → passa alla fase di output
* Memorizza ogni utente come entità separata (oggetto)

3. Struttura dati (backend)
Definisci uno schema utente come questo:

{"id": "","role": "genitore/figlio","generation": "","family_role": "","answers": {"misunderstood": "","missing": "","wish": ""},"analysis": {"basic_emotions": {},"derived_emotions": {},"mental_states": {},"relational_needs": {}}}

4. Motore di analisi del testo
Usa ollama per implementare l'elaborazione NLP per:
* estrarre parole chiave e sentiment
* mappare il testo nelle categorie predefinite:
    * emozioni
    * stati mentali
    * bisogni relazionali
Options:
* corrispondenza di parole chiave basata su regole (più semplice)
* modelli ML/NLP (più avanzati)

5. Sistema di punteggio
* Assegna valori (ad esempio 0–10) a ogni categoria
* Normalizza i punteggi per la visualizzazione radar
* Assicura coerenza tra gli utenti

6. Logica di confronto
* Calcola:
    * sovrapposizioni (punteggi alti condivisi)
    * differenze (scarti tra valori alti e bassi)
* Eventualmente confronta con un dataset esterno (altre famiglie)

7. Livello di visualizzazione
* Genera grafici radar (1 per utente)
* usa solo:
    * D3.js

Ogni grafico mostra:
* emozioni di base
* emozioni derivate
* stati mentali
* bisogni relazionali

8. Progettazione dell'interfaccia
* Mostra:
    * grafici radar individuali
    * schemi emotivi condivisi


    BASIC EMOTIONS
    {
        "Joy": 0,
        "Sadness": 0,
        "Anger": 0,
        "Fear": 0,
        "Disgust": 0,
        "Surprise": 0
    }

    DERIVED EMOTIONS
    {
        "Enthusiasm": 0,
        "Gratitude": 0,
        "Pride": 0,
        "Love": 0,
        "Satisfaction": 0,
        "Relief": 0,

        "Affliction": 0,
        "Loneliness": 0,
        "Despair": 0,
        "Disappointment": 0,
        "Nostalgia": 0,

        "Frustration": 0,
        "Impatience": 0,
        "Resentment": 0,

        "Anxiety": 0,
        "Insecurity": 0,
        "Stress": 0,
        "Panic": 0,
        "Worry": 0,

        "Shame": 0,
        "Guilt": 0,
        "Jealousy": 0,
        "Envy": 0,
        "Helplessness": 0
    }

    MENTAL STATES


{
    "Overthinking": 0,
    "Confusion": 0,
    "Apathy": 0,
    "Boredom": 0,
    "Mental fatigue": 0,
    "Indifference": 0,
    "Disinterest": 0,
    "Uncertainty": 0,
    "Dissociation / detachment": 0,
    "Feeling overwhelmed": 0
}

RELATIONAL NEEDS

{
    "Feeling heard": 0,
    "Feeling understood": 0,
    "Feeling accepted": 0,
    "Feeling valued": 0,
    "Feeling safe": 0,
    "Feeling free to be yourself": 0,
    "Empathy": 0,
    "Connection": 0,
    "Authentic dialogue": 0,
    "Belonging": 0
}


9. Feedback System
* Final question (e.g. “Did this help you reflect?”)
* Store feedback for iteration/improvement

10. Ciclo iterativo
* Consenti il riavvio (“ricomincia”)
* Mantieni le sessioni indipendenti oppure salvabili opzionalmente

## regole generali
* Niente CSS oltre a layout di base - è ancora un wireframe
* Mantieni l'interfaccia minimale e riflessiva, non gamificata
* Il sistema deve garantire che ogni partecipante interagisca in modo indipendente, senza essere influenzato dalle risposte degli altri membri della famiglia.
* Tutti gli input devono essere trattati come prospettive personali e soggettive, non come verità oggettive.
* L'agente deve rimanere neutrale in ogni momento, evitando giudizi, bias interpretativi o l'assegnazione di responsabilità. Il suo ruolo è facilitare la riflessione, non fornire soluzioni o stabilire chi ha ragione, e non deve riassumere le risposte di ciascun utente dopo ogni interazione; memorizza le risposte e le usa per confrontarle tra i membri della famiglia e altri utenti futuri.
* Le risposte degli utenti devono essere pertinenti alle domande poste. Se un partecipante fornisce un input non correlato o poco coinvolto, il sistema deve interrompere l'esperienza e invitarlo a continuare solo se è disposto a impegnarsi in modo significativo, informando l'utente riluttante del consumo energetico dell'AI.
* Tutti i dati raccolti devono essere strutturati in modo coerente per consentire il confronto tra utenti, preservando però l'individualità di ogni risposta. Privacy e separazione tra partecipanti devono essere mantenute per tutto il processo.
* Infine, il sistema deve privilegiare chiarezza e semplicità sia nell'interazione sia nell'output, in modo che l'esperienza resti accessibile, riflessiva e ripetibile nel tempo.
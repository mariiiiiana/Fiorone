# Mappa di riflessione familiare

Un'app web wireframe che raccoglie in modo indipendente le riflessioni dei membri della famiglia,
mappa le risposte in categorie emotive e relazionali e visualizza l'output con grafici radar D3.

<p align="center">
  <img src="https://media.tenor.com/AHBWsE2oYTgAAAAj/telus-critter.gif" alt="una lama" width="300">
</p>

## Prerequisiti

- [Python 3.11+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/)
- [Ollama](https://ollama.com/) in esecuzione locale

## Configurazione

```
uv sync
ollama pull llama3.2:latest
```

## Avvio

Avvia Ollama (se non è già in esecuzione):

```
ollama serve
```

In un altro terminale, avvia il server:

```
uv run uvicorn server:app --reload
```

Il frontend viene servito automaticamente dal server Python.
Apri http://localhost:8000.

## Avvio rapido (copia/incolla)

Nel terminale 1:

```bash
ollama pull llama3.2:latest
ollama serve
```

Nel terminale 2:

```bash
uv sync
uv run uvicorn server:app --reload
```

Quindi apri http://localhost:8000.

## Configurazione

Tutti i testi visibili all'utente e i prompt del modello sono in `settings.json`:

- `ui`: etichette, testo dei pulsanti, messaggi di stato
- `questions`: le 3 domande di riflessione mostrate a ogni partecipante
- `prompts`: modelli di prompt Ollama usati per validazione e analisi
- `analysis_categories`: categorie di destinazione e chiavi dei punteggi
- `ollama_model`: impostato di default su `llama3.2:latest`

I modelli dei prompt supportano l'inserimento di variabili dai dati di runtime.
Esempi di variabili usate dal backend:

- `{role}`, `{generation}`, `{family_role}`
- `{question_misunderstood}`, `{question_missing}`, `{question_wish}`
- `{answers_json}`
- `{basic_emotions_template}`, `{derived_emotions_template}`
- `{mental_states_template}`, `{relational_needs_template}`

Puoi modificare il testo dei prompt in `settings.json` senza toccare il codice dell'applicazione.

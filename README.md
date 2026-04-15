# Family Reflection Map

A wireframe web application that collects independent family member reflections,
maps answers to emotional and relational categories, and visualizes the output with D3 radar charts.

<p align="center">
  <img src="https://media.tenor.com/AHBWsE2oYTgAAAAj/telus-critter.gif" alt="a lama" width="300">
</p>

## Prerequisites

- [Python 3.11+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/)
- [Ollama](https://ollama.com/) running locally

## Setup

```
uv sync
ollama pull llama3.2:latest
```

## Run

Start Ollama (if it's not already running):

```
ollama serve
```

In another terminal, start the server:

```
uv run uvicorn server:app --reload
```

The frontend is served automatically by the Python server.
Open http://localhost:8000.

## Quick Run (copy/paste)

In terminal 1:

```bash
ollama pull llama3.2:latest
ollama serve
```

In terminal 2:

```bash
uv sync
uv run uvicorn server:app --reload
```

Then open http://localhost:8000.

## Configuration

All user-facing texts and model prompts are in `settings.json`:

- `ui`: labels, button text, status messages
- `questions`: the 3 reflective prompts shown to each participant
- `prompts`: Ollama prompt templates used for validation and analysis
- `analysis_categories`: target categories and score keys
- `ollama_model`: default set to `llama3.2:latest`

Prompt templates support variable injection from runtime data.
Examples of variables used by the backend:

- `{role}`, `{generation}`, `{family_role}`
- `{question_misunderstood}`, `{question_missing}`, `{question_wish}`
- `{answers_json}`
- `{basic_emotions_template}`, `{derived_emotions_template}`
- `{mental_states_template}`, `{relational_needs_template}`

You can change prompt text in `settings.json` without editing application code.

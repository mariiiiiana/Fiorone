"""Backend for multi-participant family reflection mapping."""

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

SETTINGS_PATH = Path("settings.json")
DATA_DIR = Path("data")
HISTORY_PATH = DATA_DIR / "family_groups.json"
OLLAMA_URL = "http://localhost:11434/api/generate"

SETTINGS = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
OLLAMA_MODEL = SETTINGS["ollama_model"]
STRICT_ENGAGEMENT_VALIDATION = bool(SETTINGS.get("strict_engagement_validation", False))


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_session() -> dict[str, Any]:
    return {
        "session_id": str(uuid.uuid4()),
        "created_at": utc_now_iso(),
        "participants": [],
        "feedback": None,
    }


CURRENT_SESSION = new_session()


class SafeTemplateDict(dict):
    def __missing__(self, key: str) -> str:
        return "{" + key + "}"


def format_prompt(template: str, variables: dict[str, Any]) -> str:
    def replace_match(match: re.Match[str]) -> str:
        key = match.group(1)
        if key in variables:
            return str(variables[key])
        return match.group(0)

    return re.sub(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}", replace_match, template)


def read_history() -> list[dict[str, Any]]:
    if not HISTORY_PATH.exists():
        return []
    try:
        return json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def write_history(history: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    HISTORY_PATH.write_text(json.dumps(history, indent=2), encoding="utf-8")


def parse_json_from_text(text: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    maybe_json = text[start : end + 1]
    try:
        parsed = json.loads(maybe_json)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return None
    return None


def clamp_score(value: Any) -> int:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return 0
    return int(max(0, min(10, round(num))))


def normalize_group(group_name: str, payload: dict[str, Any]) -> dict[str, int]:
    template = SETTINGS["analysis_categories"][group_name]
    normalized: dict[str, int] = {}
    for key in template.keys():
        normalized[key] = clamp_score(payload.get(key, 0))
    return normalized


def build_object_schema(template: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {key: {"type": "number"} for key in template.keys()},
        "required": list(template.keys()),
        "additionalProperties": False,
    }


def build_analysis_response_schema() -> dict[str, Any]:
    categories = SETTINGS["analysis_categories"]
    return {
        "type": "object",
        "properties": {
            "basic_emotions": build_object_schema(categories["basic_emotions"]),
            "derived_emotions": build_object_schema(categories["derived_emotions"]),
            "mental_states": build_object_schema(categories["mental_states"]),
            "relational_needs": build_object_schema(categories["relational_needs"]),
            "keywords": {"type": "array", "items": {"type": "string"}},
            "sentiment": {"type": "number"},
        },
        "required": [
            "basic_emotions",
            "derived_emotions",
            "mental_states",
            "relational_needs",
            "keywords",
            "sentiment",
        ],
        "additionalProperties": False,
    }


def participant_radar_values(analysis: dict[str, Any]) -> dict[str, float]:
    values: dict[str, float] = {}
    for group in (
        "basic_emotions",
        "derived_emotions",
        "mental_states",
        "relational_needs",
    ):
        scores = list(analysis[group].values())
        values[group] = round(sum(scores) / max(len(scores), 1), 2)
    return values


def average_group_maps(group_maps: list[dict[str, int]]) -> dict[str, float]:
    if not group_maps:
        return {}
    keys = list(group_maps[0].keys())
    return {
        key: round(sum(member.get(key, 0) for member in group_maps) / len(group_maps), 2)
        for key in keys
    }


def aggregate_session(participants: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    aggregate: dict[str, dict[str, float]] = {}
    for group in (
        "basic_emotions",
        "derived_emotions",
        "mental_states",
        "relational_needs",
    ):
        group_maps = [p["analysis"][group] for p in participants]
        aggregate[group] = average_group_maps(group_maps)
    return aggregate


def compute_overlaps_and_gaps(participants: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    if not participants:
        return {"overlaps": [], "gaps": []}

    aggregate = aggregate_session(participants)
    overlaps: list[dict[str, Any]] = []
    gaps: list[dict[str, Any]] = []

    for group, scores in aggregate.items():
        for key, avg_score in scores.items():
            member_scores = [p["analysis"][group][key] for p in participants]
            spread = max(member_scores) - min(member_scores)

            if avg_score >= 6 and min(member_scores) >= 4:
                overlaps.append(
                    {
                        "group": group,
                        "label": key,
                        "average": round(avg_score, 2),
                    }
                )
            if spread >= 4:
                gaps.append(
                    {
                        "group": group,
                        "label": key,
                        "spread": spread,
                        "scores": member_scores,
                    }
                )

    overlaps = sorted(overlaps, key=lambda item: item["average"], reverse=True)[:8]
    gaps = sorted(gaps, key=lambda item: item["spread"], reverse=True)[:8]
    return {"overlaps": overlaps, "gaps": gaps}


async def call_ollama(prompt: str, system_prompt: str, response_format: Any | None = None) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
    }
    if response_format is not None:
        payload["format"] = response_format

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        body = response.json()
    return body.get("response", "")


def baseline_validation(answers: dict[str, str]) -> dict[str, Any]:
    answer_text = " ".join(answers.values()).strip()
    enough_text = len(answer_text) >= 40
    contains_letters = any(ch.isalpha() for ch in answer_text)
    ok = enough_text and contains_letters
    return {
        "is_relevant": ok,
        "is_engaged": ok,
        "reason": "fallback_validation",
    }


async def validate_participant_input(payload: dict[str, Any]) -> dict[str, Any]:
    answers = payload["answers"]
    question_map = SETTINGS["questions"]
    variables = {
        "role": payload["role"],
        "generation": payload["generation"],
        "family_role": payload["family_role"],
        "question_misunderstood": question_map["misunderstood"],
        "question_missing": question_map["missing"],
        "question_wish": question_map["wish"],
        "answers_json": json.dumps(answers, ensure_ascii=True),
    }
    prompt = format_prompt(SETTINGS["prompts"]["engagement_check_prompt"], variables)
    system_prompt = SETTINGS["prompts"]["engagement_system_prompt"]
    response_format = SETTINGS["response_schemas"]["engagement"]

    try:
        model_output = await call_ollama(prompt, system_prompt, response_format=response_format)
        parsed = parse_json_from_text(model_output)

        # If the model does not return the expected schema, fallback to local validation
        # instead of rejecting the participant with a false 422.
        if not parsed:
            return baseline_validation(answers)

        raw_relevant = parsed.get("is_relevant")
        raw_engaged = parsed.get("is_engaged")
        if not isinstance(raw_relevant, bool) or not isinstance(raw_engaged, bool):
            return baseline_validation(answers)

        is_relevant = raw_relevant
        is_engaged = raw_engaged
        reason = str(parsed.get("reason", ""))
        return {
            "is_relevant": is_relevant,
            "is_engaged": is_engaged,
            "reason": reason,
        }
    except (httpx.HTTPError, json.JSONDecodeError, KeyError):
        return baseline_validation(answers)


def empty_analysis() -> dict[str, Any]:
    base = SETTINGS["analysis_categories"]
    return {
        "basic_emotions": dict(base["basic_emotions"]),
        "derived_emotions": dict(base["derived_emotions"]),
        "mental_states": dict(base["mental_states"]),
        "relational_needs": dict(base["relational_needs"]),
        "keywords": [],
        "sentiment": 0.0,
    }


async def analyze_participant(payload: dict[str, Any]) -> dict[str, Any]:
    question_map = SETTINGS["questions"]
    categories = SETTINGS["analysis_categories"]
    variables = {
        "role": payload["role"],
        "generation": payload["generation"],
        "family_role": payload["family_role"],
        "question_misunderstood": question_map["misunderstood"],
        "question_missing": question_map["missing"],
        "question_wish": question_map["wish"],
        "answers_json": json.dumps(payload["answers"], ensure_ascii=True),
        "basic_emotions_template": json.dumps(categories["basic_emotions"], ensure_ascii=True),
        "derived_emotions_template": json.dumps(categories["derived_emotions"], ensure_ascii=True),
        "mental_states_template": json.dumps(categories["mental_states"], ensure_ascii=True),
        "relational_needs_template": json.dumps(categories["relational_needs"], ensure_ascii=True),
    }
    prompt = format_prompt(SETTINGS["prompts"]["analysis_prompt"], variables)
    system_prompt = SETTINGS["prompts"]["analysis_system_prompt"]
    response_format = build_analysis_response_schema()

    try:
        model_output = await call_ollama(prompt, system_prompt, response_format=response_format)
        parsed = parse_json_from_text(model_output) or {}
    except (httpx.HTTPError, json.JSONDecodeError):
        parsed = {}

    fallback = empty_analysis()
    normalized = {
        "basic_emotions": normalize_group("basic_emotions", parsed.get("basic_emotions", {})),
        "derived_emotions": normalize_group("derived_emotions", parsed.get("derived_emotions", {})),
        "mental_states": normalize_group("mental_states", parsed.get("mental_states", {})),
        "relational_needs": normalize_group("relational_needs", parsed.get("relational_needs", {})),
        "keywords": parsed.get("keywords", fallback["keywords"]),
        "sentiment": parsed.get("sentiment", fallback["sentiment"]),
    }

    if not isinstance(normalized["keywords"], list):
        normalized["keywords"] = []

    try:
        normalized["sentiment"] = round(float(normalized["sentiment"]), 3)
    except (TypeError, ValueError):
        normalized["sentiment"] = 0.0

    normalized["sentiment"] = max(-1.0, min(1.0, normalized["sentiment"]))
    normalized["keywords"] = [str(item) for item in normalized["keywords"]][:10]
    return normalized


def combine_historical_aggregate(history: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    if not history:
        return {}

    all_aggregates = [entry.get("aggregate", {}) for entry in history if entry.get("aggregate")]
    if not all_aggregates:
        return {}

    combined: dict[str, dict[str, float]] = {}
    for group in (
        "basic_emotions",
        "derived_emotions",
        "mental_states",
        "relational_needs",
    ):
        group_maps = [agg[group] for agg in all_aggregates if group in agg]
        if not group_maps:
            continue
        combined[group] = average_group_maps(group_maps)
    return combined


def compare_current_vs_historical(
    current_aggregate: dict[str, dict[str, float]],
    historical_aggregate: dict[str, dict[str, float]],
) -> dict[str, Any]:
    if not historical_aggregate:
        return {
            "alignment": [],
            "divergence": [],
            "note": "No historical groups available yet.",
        }

    alignment: list[str] = []
    divergence: list[str] = []

    for group, scores in current_aggregate.items():
        historical_scores = historical_aggregate.get(group, {})
        for label, current_value in scores.items():
            historical_value = historical_scores.get(label)
            if historical_value is None:
                continue
            diff = round(current_value - historical_value, 2)
            if abs(diff) <= 1.5:
                alignment.append(
                    f"{group}:{label} (current {current_value}, historical {historical_value})"
                )
            elif abs(diff) >= 3:
                direction = "higher" if diff > 0 else "lower"
                divergence.append(
                    f"{group}:{label} is {direction} by {abs(diff)} points"
                )

    return {
        "alignment": alignment[:8],
        "divergence": divergence[:8],
        "note": "Neutral aggregate comparison between current and previous groups.",
    }


async def compare_external_with_ollama(
    current_aggregate: dict[str, dict[str, float]],
    historical_aggregate: dict[str, dict[str, float]],
) -> dict[str, Any]:
    fallback = compare_current_vs_historical(current_aggregate, historical_aggregate)
    if not historical_aggregate:
        return fallback

    variables = {
        "current_aggregate_json": json.dumps(current_aggregate, ensure_ascii=True),
        "historical_aggregate_json": json.dumps(historical_aggregate, ensure_ascii=True),
    }
    prompt = format_prompt(SETTINGS["prompts"]["external_comparison_prompt"], variables)
    system_prompt = SETTINGS["prompts"]["analysis_system_prompt"]
    response_format = SETTINGS["response_schemas"]["external_comparison"]

    try:
        model_output = await call_ollama(prompt, system_prompt, response_format=response_format)
        parsed = parse_json_from_text(model_output) or {}
    except (httpx.HTTPError, json.JSONDecodeError, KeyError):
        return fallback

    alignment = parsed.get("alignment", fallback["alignment"])
    divergence = parsed.get("divergence", fallback["divergence"])
    note = parsed.get("note", fallback["note"])

    if not isinstance(alignment, list):
        alignment = fallback["alignment"]
    if not isinstance(divergence, list):
        divergence = fallback["divergence"]
    if not isinstance(note, str):
        note = fallback["note"]

    return {
        "alignment": [str(item) for item in alignment][:8],
        "divergence": [str(item) for item in divergence][:8],
        "note": note,
    }


class ParticipantRequest(BaseModel):
    role: str
    generation: str
    family_role: str
    answers: dict[str, str]


class FeedbackRequest(BaseModel):
    helpful: bool
    feedback: str = ""


app = FastAPI()


@app.get("/app-config")
async def app_config() -> dict[str, Any]:
    return {
        "ui": SETTINGS["ui"],
        "profile_options": SETTINGS.get("profile_options", {}),
        "questions": SETTINGS["questions"],
        "max_radar_charts": SETTINGS.get("max_radar_charts", 4),
    }


@app.post("/session/reset")
async def reset_session() -> dict[str, Any]:
    global CURRENT_SESSION
    CURRENT_SESSION = new_session()
    return {
        "ok": True,
        "session_id": CURRENT_SESSION["session_id"],
    }


@app.post("/participant")
async def add_participant(request: ParticipantRequest) -> dict[str, Any]:
    payload = request.model_dump()

    for field in ("role", "generation", "family_role"):
        if not str(payload[field]).strip():
            raise HTTPException(status_code=400, detail="Missing required profile fields")

    expected_question_keys = set(SETTINGS["questions"].keys())
    if set(payload["answers"].keys()) != expected_question_keys:
        raise HTTPException(status_code=400, detail="Answers must match configured questions")

    if any(not str(value).strip() for value in payload["answers"].values()):
        raise HTTPException(status_code=400, detail="All answers are required")

    validation = await validate_participant_input(payload)
    is_validation_ok = validation["is_relevant"] and validation["is_engaged"]
    if STRICT_ENGAGEMENT_VALIDATION and not is_validation_ok:
        raise HTTPException(
            status_code=422,
            detail={
                "message": SETTINGS["ui"]["messages"]["disengaged_input"],
                "reason": validation.get("reason", ""),
            },
        )

    analysis = await analyze_participant(payload)
    participant = {
        "id": str(uuid.uuid4()),
        "role": payload["role"].strip(),
        "generation": payload["generation"].strip(),
        "family_role": payload["family_role"].strip(),
        "answers": payload["answers"],
        "analysis": analysis,
        "created_at": utc_now_iso(),
    }

    CURRENT_SESSION["participants"].append(participant)

    return {
        "ok": True,
        "participant_id": participant["id"],
        "participant_count": len(CURRENT_SESSION["participants"]),
        "message": (
            SETTINGS["ui"]["messages"]["disengaged_input"]
            if not is_validation_ok
            else SETTINGS["ui"]["member_saved"]
        ),
    }


@app.post("/analysis/finalize")
async def finalize_analysis() -> dict[str, Any]:
    participants = CURRENT_SESSION["participants"]
    if len(participants) < 2:
        raise HTTPException(
            status_code=400,
            detail=SETTINGS["ui"]["messages"]["min_participants"],
        )

    aggregate = aggregate_session(participants)
    patterns = compute_overlaps_and_gaps(participants)

    history = read_history()
    historical_aggregate = combine_historical_aggregate(history)
    external_comparison = await compare_external_with_ollama(aggregate, historical_aggregate)

    radar_participants = []
    for item in participants:
        radar_participants.append(
            {
                "id": item["id"],
                "role": item["role"],
                "generation": item["generation"],
                "family_role": item["family_role"],
                "analysis": item["analysis"],
                "keywords": item["analysis"]["keywords"],
                "sentiment": item["analysis"]["sentiment"],
            }
        )

    history.append(
        {
            "session_id": CURRENT_SESSION["session_id"],
            "created_at": CURRENT_SESSION["created_at"],
            "saved_at": utc_now_iso(),
            "participants_count": len(participants),
            "aggregate": aggregate,
        }
    )
    write_history(history)

    return {
        "ok": True,
        "session_id": CURRENT_SESSION["session_id"],
        "participants": radar_participants,
        "patterns": patterns,
        "external_comparison": external_comparison,
        "max_radar_charts": SETTINGS.get("max_radar_charts", 4),
    }


@app.post("/feedback")
async def save_feedback(request: FeedbackRequest) -> dict[str, Any]:
    CURRENT_SESSION["feedback"] = {
        "helpful": request.helpful,
        "feedback": request.feedback.strip(),
        "created_at": utc_now_iso(),
    }
    return {"ok": True, "message": SETTINGS["ui"]["messages"]["feedback_saved"]}


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse("static/index.html")

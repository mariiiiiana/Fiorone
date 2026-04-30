function requestJson(path, options) {
  return fetch(path, options).then(function (response) {
    return response.text().then(function (text) {
      var data = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw data;
      }
      return data;
    });
  });
}

function getAppConfig() {
  return requestJson("/app-config", { method: "GET" });
}

function resetSession() {
  return requestJson("/session/reset", { method: "POST" });
}

function submitParticipant(payload) {
  return requestJson("/participant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function finalizeAnalysis() {
  return requestJson("/analysis/finalize", { method: "POST" });
}

function submitFeedback(payload) {
  return requestJson("/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function saveSession() {
  return requestJson("/session/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

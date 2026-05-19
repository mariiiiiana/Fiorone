var app = document.getElementById("app");
var state = {
  config: null,
  participantCount: 0,
};

function t(path) {
  var keys = path.split(".");
  var value = state.config;
  for (var i = 0; i < keys.length; i += 1) {
    if (!value) return "";
    value = value[keys[i]];
  }
  return value;
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(function (word) {
      return word.length > 0;
    }).length;
}

function getMinWordsPerAnswer() {
  return state.config && state.config.min_words_per_answer
    ? state.config.min_words_per_answer
    : 10;
}

function validateParticipantAnswers(payload) {
  var minWords = getMinWordsPerAnswer();
  var keys = Object.keys(payload.answers || {});

  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    var words = countWords(payload.answers[key]);
    if (words < minWords) {
      return {
        ok: false,
        message:
          "La risposta a \"" + key + "\" ha solo " + words + " parole. Servono almeno " + minWords + " parole.",
      };
    }
  }

  return { ok: true, message: "" };
}

function formatValidationDebug(debugInfo) {
  if (!debugInfo) return "";

  var counts = Object.keys(debugInfo.word_counts || {})
    .map(function (key) {
      return key + ": " + debugInfo.word_counts[key] + " parole";
    })
    .join(", ");

  return (
    "Ricevuto dal server -> ruolo: " +
    (debugInfo.role || "") +
    ", generazione: " +
    (debugInfo.generation || "") +
    ", ruolo familiare: " +
    (debugInfo.family_role || "") +
    ". Conteggi: " +
    counts
  );
}

function renderIntro() {
  clearElement(app);

  var panel = makeElement("section", "panel stack");
  panel.appendChild(makeElement("h1", "", t("ui.app_title")));
  panel.appendChild(makeElement("h2", "", t("ui.intro_title")));
  panel.appendChild(makeElement("p", "", t("ui.intro_text")));

  var startButton = makeElement("button", "", t("ui.intro_button"));
  startButton.addEventListener("click", renderPrivacy);
  panel.appendChild(startButton);

  app.appendChild(panel);
}

function renderPrivacy() {
  clearElement(app);

  var panel = makeElement("section", "panel stack");
  panel.appendChild(makeElement("h2", "", t("ui.privacy_title")));
  panel.appendChild(makeElement("p", "", t("ui.privacy_text")));

  var row = makeElement("div", "row");
  var agree = makeElement("button", "", t("ui.privacy_agree"));
  var decline = makeElement("button", "", t("ui.privacy_decline"));

  agree.addEventListener("click", renderParticipantForm);
  decline.addEventListener("click", function () {
    clearElement(app);
    var declinePanel = makeElement("section", "panel stack");
    declinePanel.appendChild(makeElement("p", "", t("ui.privacy_decline_message")));
    var restart = makeElement("button", "", t("ui.restart"));
    restart.addEventListener("click", restartFlow);
    declinePanel.appendChild(restart);
    app.appendChild(declinePanel);
  });

  row.appendChild(agree);
  row.appendChild(decline);
  panel.appendChild(row);
  app.appendChild(panel);
}

function renderParticipantForm() {
  clearElement(app);

  var panel = makeElement("section", "panel stack");
  panel.appendChild(makeElement("h2", "", t("ui.profile_title")));

  var form = makeElement("form", "stack");
  var profileOptions = state.config.profile_options || {};

  var roleInput = createLabeledSelect(t("ui.labels.role"), "role", profileOptions.role || []);
  var generationInput = createLabeledSelect(
    t("ui.labels.generation"),
    "generation",
    profileOptions.generation || []
  );
  var familyRoleInput = createLabeledSelect(
    t("ui.labels.family_role"),
    "family_role",
    profileOptions.family_role || []
  );

  form.appendChild(roleInput.label);
  form.appendChild(generationInput.label);
  form.appendChild(familyRoleInput.label);
  form.appendChild(
    makeElement(
      "p",
      "muted",
      "Per il ruolo familiare, scegli la corrispondenza più vicina alla tua posizione nel sistema familiare."
    )
  );

  form.appendChild(makeElement("h3", "", t("ui.questions_title")));
  form.appendChild(
    makeElement(
      "p",
      "instructions",
      t("ui.questions_instructions")
    )
  );

  var questionFields = {};
  var answerStatus = makeElement("div", "status muted", "");
  Object.keys(state.config.questions).forEach(function (key) {
    var field = createLabeledInput(state.config.questions[key], key, true);
    questionFields[key] = field.field;
    form.appendChild(field.label);

    field.field.addEventListener("input", function () {
      updateFormState();
    });
  });

  form.appendChild(answerStatus);

  var saveButton = makeElement("button", "", t("ui.submit_participant"));
  saveButton.type = "submit";
  form.appendChild(saveButton);

  var status = makeElement("div", "status muted", "");
  form.appendChild(status);

  function buildPayload() {
    var payload = {
      role: roleInput.field.value.trim(),
      generation: generationInput.field.value.trim(),
      family_role: familyRoleInput.field.value.trim(),
      answers: {},
    };

    Object.keys(questionFields).forEach(function (key) {
      payload.answers[key] = questionFields[key].value.trim();
    });

    return payload;
  }

  function updateFormState() {
    var payload = buildPayload();
    var hasEmptyProfile = !payload.role || !payload.generation || !payload.family_role;
    var hasEmptyAnswer = Object.keys(payload.answers).some(function (key) {
      return !payload.answers[key];
    });

    if (hasEmptyProfile || hasEmptyAnswer) {
      answerStatus.textContent = "Ogni risposta deve contenere almeno " + getMinWordsPerAnswer() + " parole.";
      saveButton.disabled = true;
      return;
    }

    var validation = validateParticipantAnswers(payload);
    answerStatus.textContent = validation.ok ? "" : validation.message;
    saveButton.disabled = !validation.ok;
  }

  roleInput.field.addEventListener("change", updateFormState);
  generationInput.field.addEventListener("change", updateFormState);
  familyRoleInput.field.addEventListener("change", updateFormState);
  updateFormState();

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var payload = buildPayload();

    var hasEmptyProfile = !payload.role || !payload.generation || !payload.family_role;
    var hasEmptyAnswer = Object.keys(payload.answers).some(function (key) {
      return !payload.answers[key];
    });

    if (hasEmptyProfile || hasEmptyAnswer) {
      showStatus(status, t("ui.messages.participant_validation_error"), true);
      return;
    }

    var validation = validateParticipantAnswers(payload);
    if (!validation.ok) {
      showStatus(status, validation.message, true);
      return;
    }

    showStatus(status, t("ui.loading"), false);

    submitParticipant(payload)
      .then(function (result) {
        if (result && result.validation_ok === false) {
          var debugText = formatValidationDebug(result.validation_debug);
          showStatus(
            status,
            (result.message || t("ui.messages.disengaged_input")) +
              (debugText ? " | " + debugText : ""),
            true
          );
          return;
        }

        state.participantCount = result.participant_count;
        renderCheckpoint(result.message);
      })
      .catch(function (error) {
        showStatus(
          status,
          extractErrorMessage(error, t("ui.messages.network_error")),
          true
        );
      });
  });

  panel.appendChild(form);
  app.appendChild(panel);
}

function renderDisengagementScreen() {
  clearElement(app);

  var panel = makeElement("section", "panel stack");
  panel.appendChild(makeElement("h2", "", t("ui.messages.disengaged_title")));
  panel.appendChild(makeElement("p", "", t("ui.messages.disengaged_message_1")));
  panel.appendChild(makeElement("p", "", t("ui.messages.disengaged_message_2")));
  panel.appendChild(makeElement("p", "", t("ui.messages.disengaged_message_3")));

  var row = makeElement("div", "row");
  var interruptButton = makeElement("button", "", t("ui.messages.disengaged_interrupt"));
  var restartButton = makeElement("button", "", t("ui.messages.disengaged_restart"));

  interruptButton.addEventListener("click", function () {
    clearElement(app);
    var endPanel = makeElement("section", "panel stack");
    endPanel.appendChild(makeElement("h2", "", "Sessione interrotta"));
    endPanel.appendChild(
      makeElement("p", "", "Grazie per aver partecipato. Puoi riavviare l'esperienza quando sarai pronto.")
    );
    var restartButton2 = makeElement("button", "", t("ui.restart"));
    restartButton2.addEventListener("click", restartFlow);
    endPanel.appendChild(restartButton2);
    app.appendChild(endPanel);
  });

  restartButton.addEventListener("click", restartFlow);

  row.appendChild(interruptButton);
  row.appendChild(restartButton);
  panel.appendChild(row);
  app.appendChild(panel);
}

function renderCheckpoint(message) {
  clearElement(app);

  var panel = makeElement("section", "panel stack");
  panel.appendChild(makeElement("h2", "", t("ui.ready_title")));
  panel.appendChild(makeElement("p", "", t("ui.ready_text")));
  panel.appendChild(makeElement("p", "muted", message || t("ui.member_saved")));
  panel.appendChild(
    makeElement("p", "muted", "Partecipanti raccolti: " + String(state.participantCount))
  );
  if (state.participantCount < 2) {
    panel.appendChild(
      makeElement(
        "p",
        "muted",
        "Sono necessari almeno due partecipanti prima di iniziare l'analisi."
      )
    );
  }

  var row = makeElement("div", "row");
  var addButton = makeElement("button", "", t("ui.add_member"));
  var readyButton = makeElement("button", "", t("ui.we_are_ready"));
  readyButton.disabled = state.participantCount < 2;

  addButton.addEventListener("click", renderParticipantForm);
  readyButton.addEventListener("click", function () {
    renderResultsLoading();
    finalizeAnalysis()
      .then(renderResults)
      .catch(function (error) {
        renderCheckpoint(extractErrorMessage(error, t("ui.messages.network_error")));
      });
  });

  row.appendChild(addButton);
  row.appendChild(readyButton);
  panel.appendChild(row);
  app.appendChild(panel);
}

function renderResultsLoading() {
  clearElement(app);
  var panel = makeElement("section", "panel stack");
  panel.appendChild(makeElement("h2", "", t("ui.analysis_title")));
  panel.appendChild(makeElement("p", "", t("ui.loading")));
  app.appendChild(panel);
}

function renderResults(result) {
  clearElement(app);

  var panel = makeElement("section", "panel stack");
  panel.appendChild(makeElement("h2", "", t("ui.analysis_title")));

  // (I grafici familiari verranno mostrati dopo i dettagli dei singoli partecipanti.)

  

  // INDIVIDUAL PARTICIPANTS - Sezione dettagli singoli
  var panel2 = makeElement("section", "panel stack");
  panel2.appendChild(makeElement("h3", "", "Dettagli Singoli Partecipanti"));

  panel2.appendChild(
    makeElement(
      "p",
      "muted",
      "Ogni partecipante viene mostrato con quattro grafici a ragnatela costruiti dai punteggi generati grezzi, non dalle medie."
    )
  );

  var participantsWrap = makeElement("div", "participant-list stack");
  result.participants.forEach(function (participant, index) {
    var memberCard = makeElement("section", "panel stack member-card");
    memberCard.appendChild(
      makeElement(
        "h4",
        "",
        "Membro " +
          String(index + 1) +
          " - " +
          participant.role +
          " / " +
          participant.generation
      )
    );
    memberCard.appendChild(makeElement("p", "muted", participant.family_role));
    memberCard.appendChild(
      makeElement(
        "p",
        "muted",
        "I dati generati per questo membro sono mostrati qui sotto in quattro diagrammi separati."
      )
    );

    var chartsWrap = makeElement("div", "member-charts");
    var analysis = participant.analysis || {};
    ["basic_emotions", "derived_emotions", "mental_states", "relational_needs"].forEach(
      function (groupKey) {
        drawSpiderChart(
          chartsWrap,
          groupKey,
          analysis[groupKey] || {},
          participant.role + " / " + participant.generation + " / " + participant.family_role
        );
      }
    );
    memberCard.appendChild(chartsWrap);

    participantsWrap.appendChild(memberCard);
  });
  panel2.appendChild(participantsWrap);
  panel.appendChild(panel2);

  // FAMILY AVERAGE RADARS - Medie per categoria
  if (result.family_average_radar) {
    var familyAverageSection = makeElement("section", "panel stack family-average-maps");
    familyAverageSection.appendChild(
      makeElement(
        "h3",
        "",
        "Radar della Famiglia - Medie per categoria"
      )
    );
    familyAverageSection.appendChild(
      makeElement(
        "p",
        "muted",
        "Questi quattro grafici mostrano la media dei punteggi per ciascuna categoria calcolata su tutti i membri della famiglia."
      )
    );

    var familyAvgWrap = makeElement("div", "family-average-charts");
    var groups = ["basic_emotions", "derived_emotions", "mental_states", "relational_needs"];
    groups.forEach(function (groupKey) {
      var data = (result.family_average_radar && result.family_average_radar[groupKey]) || {};
      drawSpiderChart(
        familyAvgWrap,
        groupKey,
        data,
        "Media Famiglia - " + groupKey
      );
    });

    familyAverageSection.appendChild(familyAvgWrap);
    panel.appendChild(familyAverageSection);
  }

  panel.appendChild(makeElement("h3", "", t("ui.shared_patterns_title")));
  var overlapList = makeElement("ul", "list");
  result.patterns.overlaps.forEach(function (pattern) {
    overlapList.appendChild(makeElement("li", "", patternToText(pattern)));
  });
  if (!result.patterns.overlaps.length) {
    overlapList.appendChild(makeElement("li", "", "Non sono state trovate sovrapposizioni significative."));
  }
  panel.appendChild(overlapList);

  panel.appendChild(makeElement("h3", "", t("ui.gaps_title")));
  var gapsList = makeElement("ul", "list");
  result.patterns.gaps.forEach(function (pattern) {
    gapsList.appendChild(makeElement("li", "", patternToText(pattern)));
  });
  if (!result.patterns.gaps.length) {
    gapsList.appendChild(makeElement("li", "", "Non sono state trovate differenze significative."));
  }
  panel.appendChild(gapsList);

  panel.appendChild(makeElement("h3", "", t("ui.external_title")));
  panel.appendChild(makeElement("p", "muted", result.external_comparison.note || ""));

  var alignment = makeElement("ul", "list");
  result.external_comparison.alignment.forEach(function (item) {
    alignment.appendChild(makeElement("li", "", item));
  });
  if (!result.external_comparison.alignment.length) {
    alignment.appendChild(makeElement("li", "", "Nessun elemento di allineamento disponibile."));
  }
  panel.appendChild(alignment);

  var divergence = makeElement("ul", "list");
  result.external_comparison.divergence.forEach(function (item) {
    divergence.appendChild(makeElement("li", "", item));
  });
  if (!result.external_comparison.divergence.length) {
    divergence.appendChild(makeElement("li", "", "Nessun elemento di divergenza disponibile."));
  }
  panel.appendChild(divergence);

  panel.appendChild(buildFeedbackSection());
  app.appendChild(panel);
}

function buildFeedbackSection() {
  var wrapper = makeElement("section", "panel stack");
  wrapper.appendChild(makeElement("h3", "", t("ui.feedback_title")));
  wrapper.appendChild(makeElement("p", "", t("ui.feedback_question")));

  var form = makeElement("form", "stack");
  var row = makeElement("div", "row");
  var yesLabel = makeElement("label", "", "Sì");
  var noLabel = makeElement("label", "", "No");

  var yes = document.createElement("input");
  yes.type = "radio";
  yes.name = "helpful";
  yes.value = "yes";
  yes.required = true;

  var no = document.createElement("input");
  no.type = "radio";
  no.name = "helpful";
  no.value = "no";
  no.required = true;

  yesLabel.prepend(yes);
  noLabel.prepend(no);
  row.appendChild(yesLabel);
  row.appendChild(noLabel);

  var note = createLabeledInput(t("ui.feedback_placeholder"), "feedback", true);
  var submit = makeElement("button", "", t("ui.feedback_submit"));
  submit.type = "submit";
  var saveData = makeElement("button", "", "Salva dati della sessione");
  saveData.type = "button";
  var restart = makeElement("button", "", t("ui.restart"));
  restart.type = "button";
  var status = makeElement("div", "status muted", "");

  form.appendChild(row);
  form.appendChild(note.label);
  form.appendChild(submit);
  form.appendChild(saveData);
  form.appendChild(restart);
  form.appendChild(status);

  restart.addEventListener("click", restartFlow);
  
  saveData.addEventListener("click", function () {
    showStatus(status, t("ui.loading"), false);
    saveSession()
      .then(function (result) {
        showStatus(status, result.message || t("ui.messages.session_saved"), false);
      })
      .catch(function (error) {
        showStatus(
          status,
          extractErrorMessage(error, t("ui.messages.network_error")),
          true
        );
      });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var helpful = form.querySelector('input[name="helpful"]:checked');
    if (!helpful) {
      showStatus(status, t("ui.messages.network_error"), true);
      return;
    }

    showStatus(status, t("ui.loading"), false);
    submitFeedback({
      helpful: helpful.value === "yes",
      feedback: note.field.value.trim(),
    })
      .then(function (result) {
        showStatus(status, result.message || t("ui.messages.feedback_saved"), false);
      })
      .catch(function (error) {
        showStatus(
          status,
          extractErrorMessage(error, t("ui.messages.network_error")),
          true
        );
      });
  });

  wrapper.appendChild(form);
  return wrapper;
}

function restartFlow() {
  state.participantCount = 0;
  resetSession()
    .catch(function () {
      return null;
    })
    .then(function () {
      renderIntro();
    });
}

function bootstrap() {
  getAppConfig()
    .then(function (config) {
      state.config = config;
      return resetSession();
    })
    .then(function () {
      renderIntro();
    })
    .catch(function () {
      clearElement(app);
      var panel = makeElement("section", "panel stack");
      panel.appendChild(makeElement("h2", "", "Inizializzazione fallita"));
      panel.appendChild(makeElement("p", "", "Controlla lo stato del server e riprova."));
      app.appendChild(panel);
    });
}

bootstrap();

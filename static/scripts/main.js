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

  var roleInput = createLabeledInput(t("ui.labels.role"), "role", false);
  var generationInput = createLabeledInput(t("ui.labels.generation"), "generation", false);
  var familyRoleInput = createLabeledInput(t("ui.labels.family_role"), "family_role", false);

  form.appendChild(roleInput.label);
  form.appendChild(generationInput.label);
  form.appendChild(familyRoleInput.label);

  form.appendChild(makeElement("h3", "", t("ui.questions_title")));

  var questionFields = {};
  Object.keys(state.config.questions).forEach(function (key) {
    var field = createLabeledInput(state.config.questions[key], key, true);
    questionFields[key] = field.field;
    form.appendChild(field.label);
  });

  var saveButton = makeElement("button", "", t("ui.submit_participant"));
  saveButton.type = "submit";
  form.appendChild(saveButton);

  var status = makeElement("div", "status muted", "");
  form.appendChild(status);

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var payload = {
      role: roleInput.field.value.trim(),
      generation: generationInput.field.value.trim(),
      family_role: familyRoleInput.field.value.trim(),
      answers: {},
    };

    Object.keys(questionFields).forEach(function (key) {
      payload.answers[key] = questionFields[key].value.trim();
    });

    var hasEmptyProfile = !payload.role || !payload.generation || !payload.family_role;
    var hasEmptyAnswer = Object.keys(payload.answers).some(function (key) {
      return !payload.answers[key];
    });

    if (hasEmptyProfile || hasEmptyAnswer) {
      showStatus(status, t("ui.messages.participant_validation_error"), true);
      return;
    }

    showStatus(status, t("ui.loading"), false);

    submitParticipant(payload)
      .then(function (result) {
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

function renderCheckpoint(message) {
  clearElement(app);

  var panel = makeElement("section", "panel stack");
  panel.appendChild(makeElement("h2", "", t("ui.ready_title")));
  panel.appendChild(makeElement("p", "", t("ui.ready_text")));
  panel.appendChild(makeElement("p", "muted", message || t("ui.member_saved")));
  panel.appendChild(
    makeElement("p", "muted", "Participants collected: " + String(state.participantCount))
  );

  var row = makeElement("div", "row");
  var addButton = makeElement("button", "", t("ui.add_member"));
  var readyButton = makeElement("button", "", t("ui.we_are_ready"));

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

  var chartsWrap = makeElement("div", "charts");
  var maxCharts = Number(result.max_radar_charts || 4);
  result.participants.slice(0, maxCharts).forEach(function (participant, index) {
    var title =
      "Participant " +
      String(index + 1) +
      " - " +
      participant.role +
      " / " +
      participant.generation;
    drawRadarChart(chartsWrap, participant.radar_values, title);
  });
  panel.appendChild(chartsWrap);

  if (result.participants.length > maxCharts) {
    panel.appendChild(
      makeElement(
        "p",
        "muted",
        formatWithVariables(t("ui.max_charts_note"), { max_radar_charts: maxCharts })
      )
    );
  }

  panel.appendChild(makeElement("h3", "", t("ui.shared_patterns_title")));
  var overlapList = makeElement("ul", "list");
  result.patterns.overlaps.forEach(function (pattern) {
    overlapList.appendChild(makeElement("li", "", patternToText(pattern)));
  });
  if (!result.patterns.overlaps.length) {
    overlapList.appendChild(makeElement("li", "", "No strong overlaps found."));
  }
  panel.appendChild(overlapList);

  panel.appendChild(makeElement("h3", "", t("ui.gaps_title")));
  var gapsList = makeElement("ul", "list");
  result.patterns.gaps.forEach(function (pattern) {
    gapsList.appendChild(makeElement("li", "", patternToText(pattern)));
  });
  if (!result.patterns.gaps.length) {
    gapsList.appendChild(makeElement("li", "", "No strong gaps found."));
  }
  panel.appendChild(gapsList);

  panel.appendChild(makeElement("h3", "", t("ui.external_title")));
  panel.appendChild(makeElement("p", "muted", result.external_comparison.note || ""));

  var alignment = makeElement("ul", "list");
  result.external_comparison.alignment.forEach(function (item) {
    alignment.appendChild(makeElement("li", "", item));
  });
  if (!result.external_comparison.alignment.length) {
    alignment.appendChild(makeElement("li", "", "No alignment items available."));
  }
  panel.appendChild(alignment);

  var divergence = makeElement("ul", "list");
  result.external_comparison.divergence.forEach(function (item) {
    divergence.appendChild(makeElement("li", "", item));
  });
  if (!result.external_comparison.divergence.length) {
    divergence.appendChild(makeElement("li", "", "No divergence items available."));
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
  var yesLabel = makeElement("label", "", "Yes");
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
  var restart = makeElement("button", "", t("ui.restart"));
  restart.type = "button";
  var status = makeElement("div", "status muted", "");

  form.appendChild(row);
  form.appendChild(note.label);
  form.appendChild(submit);
  form.appendChild(restart);
  form.appendChild(status);

  restart.addEventListener("click", restartFlow);

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
      panel.appendChild(makeElement("h2", "", "Initialization failed"));
      panel.appendChild(makeElement("p", "", "Check server status and try again."));
      app.appendChild(panel);
    });
}

bootstrap();

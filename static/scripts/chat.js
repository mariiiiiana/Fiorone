function clearElement(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function makeElement(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

function createLabeledInput(labelText, name, isArea) {
  var label = makeElement("label", "");
  label.textContent = labelText;

  var field = isArea ? document.createElement("textarea") : document.createElement("input");
  field.name = name;
  field.required = true;

  label.appendChild(field);
  return { label: label, field: field };
}

function createLabeledSelect(labelText, name, options) {
  var label = makeElement("label", "");
  label.textContent = labelText;

  var field = document.createElement("select");
  field.name = name;
  field.required = true;

  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Seleziona un'opzione";
  placeholder.disabled = true;
  placeholder.selected = true;
  field.appendChild(placeholder);

  (options || []).forEach(function (option) {
    var optionNode = document.createElement("option");
    optionNode.value = option.value;
    optionNode.textContent = option.label;
    field.appendChild(optionNode);
  });

  label.appendChild(field);
  return { label: label, field: field };
}

function formatAxisLabel(label) {
  var map = {
    Joy: "Gioia",
    Sadness: "Tristezza",
    Anger: "Rabbia",
    Fear: "Paura",
    Disgust: "Disgusto",
    Surprise: "Sorpresa",
    Enthusiasm: "Entusiasmo",
    Gratitude: "Gratitudine",
    Pride: "Orgoglio",
    Love: "Amore",
    Satisfaction: "Soddisfazione",
    Relief: "Sollievo",
    Affliction: "Afflizione",
    Loneliness: "Solitudine",
    Despair: "Disperazione",
    Disappointment: "Delusione",
    Nostalgia: "Nostalgia",
    Frustration: "Frustrazione",
    Impatience: "Impazienza",
    Resentment: "Risentimento",
    Anxiety: "Ansia",
    Insecurity: "Insicurezza",
    Stress: "Stress",
    Panic: "Panico",
    Worry: "Preoccupazione",
    Shame: "Vergogna",
    Guilt: "Colpa",
    Jealousy: "Gelosia",
    Envy: "Invidia",
    Helplessness: "Senso di impotenza",
    Overthinking: "Ruminazione",
    Confusion: "Confusione",
    Apathy: "Apatia",
    Boredom: "Noia",
    "Mental fatigue": "Affaticamento mentale",
    Indifference: "Indifferenza",
    Disinterest: "Disinteresse",
    Uncertainty: "Incertezza",
    "Dissociation / detachment": "Dissociazione / distacco",
    "Feeling overwhelmed": "Senso di sopraffazione",
    "Feeling heard": "Sentirsi ascoltato",
    "Feeling understood": "Sentirsi compreso",
    "Feeling accepted": "Sentirsi accettato",
    "Feeling valued": "Sentirsi valorizzato",
    "Feeling safe": "Sentirsi al sicuro",
    "Feeling free to be yourself": "Sentirsi liberi di essere se stessi",
    Empathy: "Empatia",
    Connection: "Connessione",
    "Authentic dialogue": "Dialogo autentico",
    Belonging: "Appartenenza",
  };

  return map[label] || String(label || "").replace(/_/g, " ");
}

function chartTheme(groupKey) {
  var themes = {
    basic_emotions: { stroke: "#3d5f57", fill: "rgba(61, 95, 87, 0.28)" },
    derived_emotions: { stroke: "#8d5b2b", fill: "rgba(141, 91, 43, 0.24)" },
    mental_states: { stroke: "#4a638a", fill: "rgba(74, 99, 138, 0.24)" },
    relational_needs: { stroke: "#7b4a6f", fill: "rgba(123, 74, 111, 0.22)" },
  };
  return themes[groupKey] || { stroke: "#3d5f57", fill: "rgba(61, 95, 87, 0.28)" };
}

function drawSpiderChart(container, groupKey, groupScores, memberLabel) {
  var dimensions = Object.keys(groupScores || {}).map(function (key) {
    return { key: key, label: formatAxisLabel(key) };
  });

  var card = makeElement("div", "chart-card chart-card--" + groupKey);
  card.appendChild(makeElement("h4", "chart-title", groupLabel(groupKey)));
  card.appendChild(makeElement("p", "chart-subtitle muted", memberLabel));

  if (!dimensions.length) {
    card.appendChild(makeElement("p", "muted", "Nessun punteggio generato disponibile per questo gruppo."));
    container.appendChild(card);
    return;
  }

  var largeGroup = dimensions.length > 12;
  var width = largeGroup ? 520 : 400;
  var height = largeGroup ? 480 : 360;
  var radius = largeGroup ? 170 : 126;
  var centerX = width / 2;
  var centerY = height / 2 - 6;
  var theme = chartTheme(groupKey);
  var angleSlice = (Math.PI * 2) / dimensions.length;
  var scale = d3.scaleLinear().domain([0, 10]).range([0, radius]);

  var svg = d3.create("svg").attr("width", width).attr("height", height);
  var group = svg.append("g").attr("transform", "translate(" + centerX + "," + centerY + ")");

  for (var level = 1; level <= 5; level += 1) {
    var levelRadius = (radius / 5) * level;
    var ringPoints = dimensions
      .map(function (_, index) {
        var angle = index * angleSlice - Math.PI / 2;
        return [Math.cos(angle) * levelRadius, Math.sin(angle) * levelRadius].join(",");
      })
      .join(" ");

    group
      .append("polygon")
      .attr("points", ringPoints)
      .attr("fill", "none")
      .attr("stroke", "#d5d5d5")
      .attr("stroke-width", 1);
  }

  dimensions.forEach(function (dimension, index) {
    var angle = index * angleSlice - Math.PI / 2;
    var x = Math.cos(angle) * radius;
    var y = Math.sin(angle) * radius;
    var labelRadius = largeGroup ? radius + 12 : radius + 16;
    var labelX = Math.cos(angle) * labelRadius;
    var labelY = Math.sin(angle) * labelRadius;

    group
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", x)
      .attr("y2", y)
      .attr("stroke", "#d5d5d5")
      .attr("stroke-width", 1);

    group
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 1.5)
      .attr("fill", "#b0b0b0");

    group
      .append("text")
      .attr("x", labelX)
      .attr("y", labelY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", largeGroup ? "8px" : "10px")
      .text(dimension.label);
  });

  var areaPoints = dimensions
    .map(function (dimension, index) {
      var score = Number(groupScores[dimension.key] || 0);
      var scaled = scale(score);
      var angle = index * angleSlice - Math.PI / 2;
      return [Math.cos(angle) * scaled, Math.sin(angle) * scaled].join(",");
    })
    .join(" ");

  group
    .append("polygon")
    .attr("points", areaPoints)
    .attr("fill", theme.fill)
    .attr("stroke", theme.stroke)
    .attr("stroke-width", 2.5);

  dimensions.forEach(function (dimension, index) {
    var score = Number(groupScores[dimension.key] || 0);
    var angle = index * angleSlice - Math.PI / 2;
    var pointRadius = scale(score);
    group
      .append("circle")
      .attr("cx", Math.cos(angle) * pointRadius)
      .attr("cy", Math.sin(angle) * pointRadius)
      .attr("r", 3.5)
      .attr("fill", theme.stroke);
  });

  card.appendChild(svg.node());
  container.appendChild(card);
}

function showStatus(target, text, isError) {
  target.textContent = text;
  target.style.color = isError ? "#9b2c2c" : "#2a2a2a";
}

function formatWithVariables(template, variables) {
  var output = String(template || "");
  Object.keys(variables || {}).forEach(function (key) {
    output = output.replaceAll("{" + key + "}", String(variables[key]));
  });
  return output;
}

function extractErrorMessage(error, fallbackMessage) {
  if (!error) return fallbackMessage;
  if (typeof error.detail === "string") return error.detail;
  if (error.detail && typeof error.detail.message === "string") return error.detail.message;
  if (typeof error.message === "string") return error.message;
  return fallbackMessage;
}

function groupLabel(group) {
  var map = {
    basic_emotions: "Emozioni di base",
    derived_emotions: "Emozioni derivate",
    mental_states: "Stati mentali",
    relational_needs: "Bisogni relazionali",
  };
  return map[group] || group;
}

function patternToText(pattern) {
  if (pattern.average !== undefined) {
    return groupLabel(pattern.group) + " - " + pattern.label + " (media " + pattern.average + ")";
  }
  if (pattern.spread !== undefined) {
    return groupLabel(pattern.group) + " - " + pattern.label + " (scarto " + pattern.spread + ")";
  }
  return String(pattern.label || "");
}

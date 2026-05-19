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
    basic_emotions: "Emozioni di base",
    derived_emotions: "Emozioni derivate",
    mental_states: "Stati mentali",
    relational_needs: "Bisogni relazionali",
  };

  return map[label] || String(label || "").replace(/_/g, " ");
}

function chartTheme(groupKey) {
  var themes = {
    basic_emotions: {
      stroke: "#3d5f57",
      light: "#a7d7c5",
      mid: "#5f9f90",
      dark: "#24463f",
    },
    derived_emotions: {
      stroke: "#8d5b2b",
      light: "#f1c27d",
      mid: "#c7833f",
      dark: "#6b3f1d",
    },
    mental_states: {
      stroke: "#4a638a",
      light: "#a9bce3",
      mid: "#647fb0",
      dark: "#2f4266",
    },
    relational_needs: {
      stroke: "#7b4a6f",
      light: "#d9a7cf",
      mid: "#a56598",
      dark: "#5a3150",
    },
    family_aggregate: {
      stroke: "#5b5b8a",
      light: "#b8b8d9",
      mid: "#8282b0",
      dark: "#3d3d5f",
    },
  };

  return themes[groupKey] || themes.basic_emotions;
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
  var width = largeGroup ? 460 : 400;
  var height = largeGroup ? 430 : 360;
  var radius = largeGroup ? 148 : 126;
  var centerX = width / 2;
  var centerY = height / 2;
  var theme = chartTheme(groupKey);
  var angleSlice = (Math.PI * 2) / dimensions.length;
  var scale = d3.scaleLinear().domain([0, 10]).range([0, radius]);

  var svg = d3
  .create("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", "0 0 " + width + " " + height)
  .attr("preserveAspectRatio", "xMidYMid meet");

var gradientId =
  "radar-gradient-" +
  groupKey +
  "-" +
  String(memberLabel || "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .toLowerCase();

var defs = svg.append("defs");

var gradient = defs
  .append("radialGradient")
  .attr("id", gradientId)
  .attr("cx", "50%")
  .attr("cy", "50%")
  .attr("r", "60%");

gradient
  .append("stop")
  .attr("offset", "0%")
  .attr("stop-color", theme.light)
  .attr("stop-opacity", 0.9);

gradient
  .append("stop")
  .attr("offset", "50%")
  .attr("stop-color", theme.mid)
  .attr("stop-opacity", 0.5);

gradient
  .append("stop")
  .attr("offset", "100%")
  .attr("stop-color", theme.dark)
  .attr("stop-opacity", 0.18);

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
     .attr("stroke", "#e3e8ee")
     .attr("stroke-width", 0.7);
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
    group
  .append("polygon")
  .attr("points", areaPoints)
  .attr("fill", "url(#" + gradientId + ")")
  .attr("stroke", theme.stroke)
  .attr("stroke-width", 1.4)
  .attr("stroke-linejoin", "round")
  .attr("filter", "drop-shadow(0px 6px 10px rgba(0,0,0,0.12))");

  dimensions.forEach(function (dimension, index) {
    var score = Number(groupScores[dimension.key] || 0);
    var angle = index * angleSlice - Math.PI / 2;
    var pointRadius = scale(score);
    group
      group
      .append("circle")
      .attr("cx", Math.cos(angle) * pointRadius)
      .attr("cy", Math.sin(angle) * pointRadius)
      .attr("r", 3)
      .attr("fill", "#ffffff")
      .attr("stroke", theme.stroke)
      .attr("stroke-width", 1.5);
      });

  card.appendChild(svg.node());
  container.appendChild(card);
}

function drawSpiderChartOverlay(container, groupKey, participantsData) {
  if (!participantsData || participantsData.length === 0) return;

  var largeGroup = groupKey === "family_aggregate" ? true : false;
  var width = largeGroup ? 600 : 500;
  var height = largeGroup ? 500 : 450;
  var radius = largeGroup ? 180 : 160;
  var centerX = width / 2;
  var centerY = height / 2;

  // Dimensioni comuni per tutti i partecipanti
  var dimensions = [
    { key: "basic_emotions", label: "Emozioni di Base" },
    { key: "derived_emotions", label: "Emozioni Derivate" },
    { key: "mental_states", label: "Stati Mentali" },
    { key: "relational_needs", label: "Bisogni Relazionali" }
  ];

  var angleSlice = (Math.PI * 2) / dimensions.length;
  var scale = d3.scaleLinear().domain([0, 10]).range([0, radius]);

  var svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", "0 0 " + width + " " + height)
    .attr("preserveAspectRatio", "xMidYMid meet");

  var defs = svg.append("defs");

  // Palette di colori per i partecipanti
  var colors = [
    { light: "#FF6B6B", mid: "#EE5A52", dark: "#BB3D3D", stroke: "#8B0000" },
    { light: "#4ECDC4", mid: "#40A89D", dark: "#2B7A79", stroke: "#1A5553" },
    { light: "#FFE66D", mid: "#F7D757", dark: "#D4A547", stroke: "#A6862F" },
    { light: "#95E1D3", mid: "#7BC8B5", dark: "#5FA89C", stroke: "#3D8080" },
    { light: "#C7CEEA", mid: "#B5BCDA", dark: "#9AABCA", stroke: "#7089B0" }
  ];

  // Disegna la struttura base del radar (linee, anelli)
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
      .attr("stroke", "#e3e8ee")
      .attr("stroke-width", 0.7);
  }

  // Linee radiali
  dimensions.forEach(function (dimension, index) {
    var angle = index * angleSlice - Math.PI / 2;
    var x = Math.cos(angle) * radius;
    var y = Math.sin(angle) * radius;
    var labelRadius = radius + 20;
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
      .style("font-size", "10px")
      .text(dimension.label);
  });

  // Disegna i poligoni sovrapposti per ogni partecipante
  var legendHeight = Math.min(participantsData.length * 25, 150);
  var legendY = -height / 2 + 20;

  participantsData.forEach(function (participant, participantIndex) {
    var theme = colors[participantIndex % colors.length];
    var gradientId = "radar-overlay-" + participantIndex;

    // Crea un gradiente per il poligono
    var gradient = defs
      .append("radialGradient")
      .attr("id", gradientId)
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "60%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", theme.light)
      .attr("stop-opacity", 0.5);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", theme.dark)
      .attr("stop-opacity", 0.15);

    // Calcola i punti del poligono per questo partecipante
    var areaPoints = dimensions
      .map(function (dimension, index) {
        var score = Number(participant[dimension.key] || 0);
        var scaled = scale(score);
        var angle = index * angleSlice - Math.PI / 2;
        return [Math.cos(angle) * scaled, Math.sin(angle) * scaled].join(",");
      })
      .join(" ");

    // Disegna il poligono
    group
      .append("polygon")
      .attr("points", areaPoints)
      .attr("fill", "url(#" + gradientId + ")")
      .attr("stroke", theme.stroke)
      .attr("stroke-width", 2)
      .attr("stroke-linejoin", "round")
      .attr("opacity", 0.75)
      .attr("filter", "drop-shadow(0px 4px 8px rgba(0,0,0,0.1))");

    // Disegna i punti sui vertici
    dimensions.forEach(function (dimension, index) {
      var score = Number(participant[dimension.key] || 0);
      var angle = index * angleSlice - Math.PI / 2;
      var pointRadius = scale(score);

      group
        .append("circle")
        .attr("cx", Math.cos(angle) * pointRadius)
        .attr("cy", Math.sin(angle) * pointRadius)
        .attr("r", 2.5)
        .attr("fill", theme.light)
        .attr("stroke", theme.stroke)
        .attr("stroke-width", 1);
    });

    // Aggiungi alla legenda
    var legendItemY = legendY + participantIndex * 22;
    
    // Rettangolo di colore
    group
      .append("rect")
      .attr("x", -width / 2 + 10)
      .attr("y", legendItemY)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", theme.stroke)
      .attr("opacity", 0.8);

    // Etichetta del partecipante
    var label = participant.role + " - " + participant.generation;
    group
      .append("text")
      .attr("x", -width / 2 + 28)
      .attr("y", legendItemY + 10)
      .style("font-size", "11px")
      .style("font-weight", "500")
      .text(label);
  });

  var card = makeElement("div", "chart-card");
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
    family_aggregate: "Aggregato della Famiglia",
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

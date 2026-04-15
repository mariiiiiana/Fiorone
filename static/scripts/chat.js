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

function drawRadarChart(container, radarValues, title) {
  var dimensions = [
    { key: "basic_emotions", label: "Basic emotions" },
    { key: "derived_emotions", label: "Derived emotions" },
    { key: "mental_states", label: "Mental states" },
    { key: "relational_needs", label: "Relational needs" },
  ];

  var width = 260;
  var height = 240;
  var radius = 80;
  var centerX = width / 2;
  var centerY = height / 2;

  var card = makeElement("div", "chart-card");
  card.appendChild(makeElement("h3", "", title));

  var svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height);

  var group = svg.append("g").attr("transform", "translate(" + centerX + "," + centerY + ")");
  var angleSlice = (Math.PI * 2) / dimensions.length;

  for (var level = 1; level <= 5; level += 1) {
    var levelRadius = (radius / 5) * level;
    var points = dimensions
      .map(function (_, i) {
        var angle = i * angleSlice - Math.PI / 2;
        return [Math.cos(angle) * levelRadius, Math.sin(angle) * levelRadius].join(",");
      })
      .join(" ");
    group
      .append("polygon")
      .attr("points", points)
      .attr("fill", "none")
      .attr("stroke", "#d0d0d0")
      .attr("stroke-width", 1);
  }

  dimensions.forEach(function (dimension, i) {
    var angle = i * angleSlice - Math.PI / 2;
    var x = Math.cos(angle) * radius;
    var y = Math.sin(angle) * radius;

    group
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", x)
      .attr("y2", y)
      .attr("stroke", "#d0d0d0")
      .attr("stroke-width", 1);

    group
      .append("text")
      .attr("x", Math.cos(angle) * (radius + 14))
      .attr("y", Math.sin(angle) * (radius + 14))
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(dimension.label);
  });

  var areaPoints = dimensions
    .map(function (dimension, i) {
      var score = Number(radarValues[dimension.key] || 0);
      var scaled = (score / 10) * radius;
      var angle = i * angleSlice - Math.PI / 2;
      return [Math.cos(angle) * scaled, Math.sin(angle) * scaled];
    })
    .join(" ");

  group
    .append("polygon")
    .attr("points", areaPoints)
    .attr("fill", "rgba(80, 120, 110, 0.35)")
    .attr("stroke", "#3d5f57")
    .attr("stroke-width", 2);

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
    basic_emotions: "Basic emotions",
    derived_emotions: "Derived emotions",
    mental_states: "Mental states",
    relational_needs: "Relational needs",
  };
  return map[group] || group;
}

function patternToText(pattern) {
  if (pattern.average !== undefined) {
    return groupLabel(pattern.group) + " - " + pattern.label + " (avg " + pattern.average + ")";
  }
  if (pattern.spread !== undefined) {
    return groupLabel(pattern.group) + " - " + pattern.label + " (spread " + pattern.spread + ")";
  }
  return String(pattern.label || "");
}

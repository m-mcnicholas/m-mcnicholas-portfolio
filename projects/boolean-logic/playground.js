import {
  COMPONENTS,
  canConnect,
  cloneCircuit,
  createNode,
  createStarterCircuit,
  simulateCircuit,
  validateCircuit,
  valueLabel
} from "./logic-core.js";
import { EXAMPLES, getExample } from "./examples.js";

const STORAGE_KEY = "boolean-logic-playground:v1";
const MAX_NODES = 40;
const AUTOPLAY_MS = 800;

const board = document.querySelector("#board");
const wireLayer = document.querySelector("#wire-layer");
const template = document.querySelector("#node-template");
const status = document.querySelector("#status");
const hint = document.querySelector("#connection-hint");
const exampleSelect = document.querySelector("#example-select");
const componentSelect = document.querySelector("#component-select");
const playButton = document.querySelector("#play-clock");
const referenceDetails = document.querySelector("#reference");
const laneElements = {
  input: document.querySelector("#input-lane"),
  logic: document.querySelector("#logic-lane"),
  output: document.querySelector("#output-lane")
};

let circuit = restoreCircuit();
let values = new Map();
let pendingSource = null;
let autoplayTimer = null;
let dirty = false;

function restoreCircuit() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (validateCircuit(saved).valid) return saved;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createStarterCircuit();
}

function saveCircuit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(circuit));
  } catch {
    announce("This browser could not save the circuit, but you can keep working in this tab.");
  }
}

function announce(message) {
  status.textContent = message;
}

function fillMenus() {
  exampleSelect.append(...EXAMPLES.map((example) => new Option(example.title, example.id)));
  const allowed = ["input", "clock", "buffer", "not", "and", "or", "nand", "nor", "xor", "xnor", "sr-latch", "d-latch", "d-flipflop", "t-flipflop", "output"];
  componentSelect.append(...allowed.map((type) => new Option(COMPONENTS[type].name, type)));
}

const equations = {
  buffer: "Q = A · 0→0, 1→1",
  not: "Q = ¬A · 0→1, 1→0",
  and: "Q = A ∧ B · 00→0, 01→0, 10→0, 11→1",
  or: "Q = A ∨ B · 00→0, 01→1, 10→1, 11→1",
  nand: "Q = ¬(A ∧ B) · 00→1, 01→1, 10→1, 11→0",
  nor: "Q = ¬(A ∨ B) · 00→1, 01→0, 10→0, 11→0",
  xor: "Q = A ⊕ B · 00→0, 01→1, 10→1, 11→0",
  xnor: "Q = ¬(A ⊕ B) · 00→1, 01→0, 10→0, 11→1",
  "sr-latch": "S stores 1 · R stores 0 · 00 remembers · 11 is invalid",
  "d-latch": "Enable 1 copies D · Enable 0 remembers",
  "d-flipflop": "Q takes D on each rising clock edge",
  "t-flipflop": "T 1 toggles Q on a rising edge · T 0 remembers"
};

function fillReference() {
  const grid = document.querySelector("#reference-grid");
  Object.entries(equations).forEach(([type, equation]) => {
    const card = document.createElement("article");
    card.className = "reference-card";
    const title = document.createElement("h3");
    title.textContent = `${COMPONENTS[type].short} — ${COMPONENTS[type].name}`;
    const description = document.createElement("p");
    description.textContent = COMPONENTS[type].description;
    const truth = document.createElement("p");
    truth.className = "truth-row";
    const code = document.createElement("code");
    code.textContent = equation;
    truth.append(code);
    card.append(title, description, truth);
    grid.append(card);
  });
}

function laneFor(node) {
  const group = COMPONENTS[node.type].group;
  return group === "memory" ? "logic" : group;
}

function sourceLabel(connection) {
  const source = circuit.nodes.find((node) => node.id === connection?.from);
  return source?.label ?? "not connected";
}

function buildNode(node) {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".logic-node");
  const current = values.get(node.id) ?? null;
  card.dataset.nodeId = node.id;
  card.dataset.value = valueLabel(current);
  fragment.querySelector(".node-type").textContent = COMPONENTS[node.type].short;
  const value = fragment.querySelector(".node-value");
  value.textContent = valueLabel(current);
  value.setAttribute("aria-label", `Current value ${valueLabel(current)}`);
  const label = fragment.querySelector(".node-label");
  label.value = node.label;
  label.dataset.nodeId = node.id;
  label.setAttribute("aria-label", `Label for ${COMPONENTS[node.type].name}`);

  const ports = fragment.querySelector(".node-ports");
  COMPONENTS[node.type].ports.forEach((portName) => {
    const connection = circuit.connections.find((wire) => wire.to === node.id && wire.toPort === portName);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "port input-port";
    button.dataset.nodeId = node.id;
    button.dataset.port = portName;
    button.dataset.endpoint = `in:${node.id}:${portName}`;
    button.textContent = connection ? `${portName}: ${sourceLabel(connection)}` : `${portName}: open`;
    button.setAttribute("aria-label", connection ? `${portName} input connected from ${sourceLabel(connection)}; activate to disconnect` : `${portName} input, open`);
    ports.append(button);
  });
  if (node.type !== "output") {
    const output = document.createElement("button");
    output.type = "button";
    output.className = `port output-port${pendingSource === node.id ? " is-pending" : ""}`;
    output.dataset.nodeId = node.id;
    output.dataset.endpoint = `out:${node.id}`;
    output.textContent = "output →";
    output.setAttribute("aria-label", `Connect output from ${node.label}`);
    ports.append(output);
  }

  const actions = fragment.querySelector(".node-actions");
  if (node.type === "input") {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "toggle-value";
    toggle.dataset.nodeId = node.id;
    toggle.textContent = `Toggle to ${node.value ? "0" : "1"}`;
    toggle.setAttribute("aria-pressed", String(Boolean(node.value)));
    actions.append(toggle);
  } else if (node.type === "clock") {
    const clockState = document.createElement("span");
    clockState.textContent = node.value ? "High phase" : "Low phase";
    clockState.className = "control-label";
    actions.append(clockState);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-node";
  remove.dataset.nodeId = node.id;
  remove.textContent = "Remove";
  remove.setAttribute("aria-label", `Remove ${node.label}`);
  actions.append(remove);
  return fragment;
}

function render({ advanceClock = false } = {}) {
  values = simulateCircuit(circuit, { advanceClock });
  Object.values(laneElements).forEach((lane) => lane.replaceChildren());
  for (const node of circuit.nodes) laneElements[laneFor(node)].append(buildNode(node));
  Object.entries(laneElements).forEach(([name, lane]) => {
    if (!lane.children.length) {
      const empty = document.createElement("p");
      empty.className = "empty-lane";
      empty.textContent = `Add ${name === "logic" ? "a gate or memory component" : `an ${name}`} above.`;
      lane.append(empty);
    }
  });
  document.querySelector("#circuit-title").textContent = circuit.title;
  document.querySelector("#circuit-description").textContent = circuit.description;
  hint.textContent = pendingSource
    ? `Now choose an input port for ${circuit.nodes.find((node) => node.id === pendingSource)?.label}.`
    : "Choose a component’s output, then choose an input port.";
  hint.classList.toggle("is-pending", Boolean(pendingSource));
  const hasClock = circuit.nodes.some((node) => node.type === "clock");
  document.querySelector("#step-clock").disabled = !hasClock;
  playButton.disabled = !hasClock;
  requestAnimationFrame(drawWires);
}

function connectionSpread(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(hash) % 9) - 4) * 4;
}

function drawWires() {
  const boardRect = board.getBoundingClientRect();
  wireLayer.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
  wireLayer.replaceChildren();
  const endpoints = new Map(Array.from(board.querySelectorAll("[data-endpoint]"), (element) => [element.dataset.endpoint, element]));
  const vertical = window.matchMedia("(max-width: 900px)").matches;
  circuit.connections.forEach((connection) => {
    const source = endpoints.get(`out:${connection.from}`);
    const target = endpoints.get(`in:${connection.to}:${connection.toPort}`);
    if (!source || !target) return;
    const fromRect = source.getBoundingClientRect();
    const toRect = target.getBoundingClientRect();
    const x1 = fromRect.left + fromRect.width / 2 - boardRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - boardRect.top;
    const x2 = toRect.left + toRect.width / 2 - boardRect.left;
    const y2 = toRect.top + toRect.height / 2 - boardRect.top;
    const spread = connectionSpread(connection.id);
    const bend = vertical
      ? `C ${x1 + spread} ${y1 + Math.max(34, (y2 - y1) / 2)}, ${x2 + spread} ${y2 - Math.max(34, (y2 - y1) / 2)}, ${x2} ${y2}`
      : `C ${x1 + Math.max(42, (x2 - x1) / 2)} ${y1 + spread}, ${x2 - Math.max(42, (x2 - x1) / 2)} ${y2 + spread}, ${x2} ${y2}`;
    const pathData = `M ${x1} ${y1} ${bend}`;
    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shadow.setAttribute("d", pathData);
    shadow.setAttribute("class", "wire-shadow");
    const wire = document.createElementNS("http://www.w3.org/2000/svg", "path");
    wire.setAttribute("d", pathData);
    const sourceValue = values.get(connection.from);
    wire.setAttribute("class", `wire${sourceValue === true ? " is-on" : sourceValue === null || sourceValue === undefined ? " is-unknown" : ""}`);
    wireLayer.append(shadow, wire);
  });
}

function commit(message, options) {
  dirty = true;
  render(options);
  saveCircuit();
  announce(message);
}

function stopAutoplay() {
  if (autoplayTimer) clearInterval(autoplayTimer);
  autoplayTimer = null;
  playButton.textContent = "Play";
  playButton.setAttribute("aria-pressed", "false");
}

board.addEventListener("click", (event) => {
  const toggle = event.target.closest(".toggle-value");
  if (toggle) {
    const node = circuit.nodes.find((item) => item.id === toggle.dataset.nodeId);
    node.value = !Boolean(node.value);
    commit(`${node.label} is now ${valueLabel(node.value)}.`);
    return;
  }
  const remove = event.target.closest(".remove-node");
  if (remove) {
    const node = circuit.nodes.find((item) => item.id === remove.dataset.nodeId);
    circuit.nodes = circuit.nodes.filter((item) => item.id !== node.id);
    circuit.connections = circuit.connections.filter((wire) => wire.from !== node.id && wire.to !== node.id);
    if (pendingSource === node.id) pendingSource = null;
    commit(`${node.label} was removed.`);
    return;
  }
  const output = event.target.closest(".output-port");
  if (output) {
    pendingSource = pendingSource === output.dataset.nodeId ? null : output.dataset.nodeId;
    render();
    announce(pendingSource ? `Output selected from ${circuit.nodes.find((node) => node.id === pendingSource).label}.` : "Connection cancelled.");
    return;
  }
  const input = event.target.closest(".input-port");
  if (!input) return;
  const existing = circuit.connections.find((wire) => wire.to === input.dataset.nodeId && wire.toPort === input.dataset.port);
  if (!pendingSource) {
    if (!existing) {
      announce("Choose an output before choosing an open input.");
      return;
    }
    circuit.connections = circuit.connections.filter((wire) => wire !== existing);
    commit("Wire disconnected.");
    return;
  }
  const result = canConnect(circuit, pendingSource, input.dataset.nodeId, input.dataset.port);
  if (!result.valid) {
    announce(result.reason);
    return;
  }
  circuit.connections = circuit.connections.filter((wire) => !(wire.to === input.dataset.nodeId && wire.toPort === input.dataset.port));
  circuit.connections.push({ id: `wire-${Date.now()}-${Math.random().toString(16).slice(2)}`, from: pendingSource, to: input.dataset.nodeId, toPort: input.dataset.port });
  pendingSource = null;
  commit("Components connected.");
});

function syncLabelReferences(node) {
  const outputButton = board.querySelector(`.output-port[data-node-id="${node.id}"]`);
  if (outputButton) outputButton.setAttribute("aria-label", `Connect output from ${node.label}`);
  circuit.connections
    .filter((wire) => wire.from === node.id)
    .forEach((wire) => {
      const portButton = board.querySelector(`[data-endpoint="in:${wire.to}:${wire.toPort}"]`);
      if (!portButton) return;
      portButton.textContent = `${wire.toPort}: ${node.label}`;
      portButton.setAttribute("aria-label", `${wire.toPort} input connected from ${node.label}; activate to disconnect`);
    });
  if (pendingSource === node.id) hint.textContent = `Now choose an input port for ${node.label}.`;
}

board.addEventListener("input", (event) => {
  if (!event.target.matches(".node-label")) return;
  const node = circuit.nodes.find((item) => item.id === event.target.dataset.nodeId);
  node.label = event.target.value.trimStart() || COMPONENTS[node.type].name;
  dirty = true;
  saveCircuit();
  syncLabelReferences(node);
  requestAnimationFrame(drawWires);
});

document.querySelector("#add-component").addEventListener("click", () => {
  if (circuit.nodes.length >= MAX_NODES) {
    announce(`This guided workspace supports up to ${MAX_NODES} components.`);
    return;
  }
  const type = componentSelect.value;
  const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  circuit.nodes.push(createNode(type, id));
  commit(`${COMPONENTS[type].name} added.`);
});

document.querySelector("#load-example").addEventListener("click", () => {
  if (dirty && !window.confirm("Replace the current circuit with this example?")) return;
  const example = getExample(exampleSelect.value);
  if (!example) return;
  stopAutoplay();
  pendingSource = null;
  circuit = example;
  dirty = false;
  render();
  saveCircuit();
  announce(`${circuit.title} loaded. It is ready to edit.`);
});

document.querySelector("#reset-circuit").addEventListener("click", () => {
  if (dirty && !window.confirm("Reset this workspace to the starter circuit?")) return;
  stopAutoplay();
  pendingSource = null;
  circuit = createStarterCircuit();
  dirty = false;
  render();
  saveCircuit();
  announce("Starter circuit restored.");
});

document.querySelector("#step-clock").addEventListener("click", () => {
  commit("Clock advanced one half-cycle.", { advanceClock: true });
});

playButton.addEventListener("click", () => {
  if (autoplayTimer) {
    stopAutoplay();
    announce("Clock paused.");
    return;
  }
  autoplayTimer = setInterval(() => commit("Clock advanced automatically.", { advanceClock: true }), AUTOPLAY_MS);
  playButton.textContent = "Pause";
  playButton.setAttribute("aria-pressed", "true");
  announce("Clock autoplay started.");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (pendingSource) {
    pendingSource = null;
    render();
    announce("Connection cancelled.");
  }
  if (referenceDetails.open) referenceDetails.open = false;
});

document.addEventListener("click", (event) => {
  if (referenceDetails.open && !referenceDetails.contains(event.target)) referenceDetails.open = false;
});

new ResizeObserver(() => requestAnimationFrame(drawWires)).observe(board);
fillMenus();
fillReference();
render();

export const UNKNOWN = null;

export const COMPONENTS = Object.freeze({
  input: { name: "Toggle input", short: "IN", ports: [], group: "input", description: "A value you can switch between false and true." },
  clock: { name: "Clock", short: "CLK", ports: [], group: "input", description: "Alternates between 0 and 1 when time advances." },
  buffer: { name: "Buffer", short: "BUF", ports: ["in"], group: "logic", description: "Copies its input without changing it." },
  not: { name: "NOT", short: "NOT", ports: ["in"], group: "logic", description: "Produces the opposite of its input." },
  and: { name: "AND", short: "AND", ports: ["a", "b"], group: "logic", description: "True only when both inputs are true." },
  or: { name: "OR", short: "OR", ports: ["a", "b"], group: "logic", description: "True when either input is true." },
  nand: { name: "NAND", short: "NAND", ports: ["a", "b"], group: "logic", description: "The opposite of AND." },
  nor: { name: "NOR", short: "NOR", ports: ["a", "b"], group: "logic", description: "The opposite of OR." },
  xor: { name: "XOR", short: "XOR", ports: ["a", "b"], group: "logic", description: "True when the inputs are different." },
  xnor: { name: "XNOR", short: "XNOR", ports: ["a", "b"], group: "logic", description: "True when the inputs are the same." },
  "sr-latch": { name: "SR latch", short: "SR", ports: ["set", "reset"], group: "memory", description: "Remembers a bit; Set stores 1 and Reset stores 0." },
  "d-latch": { name: "D latch", short: "DL", ports: ["data", "enable"], group: "memory", description: "Copies Data while Enable is true, then remembers it." },
  "d-flipflop": { name: "D flip-flop", short: "DFF", ports: ["data", "clock"], group: "memory", description: "Stores Data on a rising clock edge." },
  "t-flipflop": { name: "T flip-flop", short: "TFF", ports: ["toggle", "clock"], group: "memory", description: "Toggles its stored bit on a rising edge when T is true." },
  output: { name: "Output probe", short: "OUT", ports: ["in"], group: "output", description: "Displays the final value of a circuit." }
});

const memoryTypes = new Set(["sr-latch", "d-latch", "d-flipflop", "t-flipflop"]);

export function valueLabel(value) {
  return value === true ? "1" : value === false ? "0" : "?";
}

export function createNode(type, id, label = COMPONENTS[type]?.name ?? "Node") {
  if (!COMPONENTS[type]) throw new Error(`Unknown component type: ${type}`);
  const node = { id, type, label };
  if (type === "input" || type === "clock") node.value = false;
  if (memoryTypes.has(type)) {
    node.state = false;
    node.lastClock = false;
  }
  return node;
}

export function createStarterCircuit() {
  return {
    version: 1,
    id: "starter-and",
    title: "My first circuit",
    description: "Toggle both inputs to make the light turn on.",
    nodes: [
      { ...createNode("input", "input-a", "Switch A"), value: false },
      { ...createNode("input", "input-b", "Switch B"), value: false },
      createNode("and", "gate-and", "Both switches"),
      createNode("output", "output-light", "Light")
    ],
    connections: [
      { id: "wire-1", from: "input-a", to: "gate-and", toPort: "a" },
      { id: "wire-2", from: "input-b", to: "gate-and", toPort: "b" },
      { id: "wire-3", from: "gate-and", to: "output-light", toPort: "in" }
    ]
  };
}

export function cloneCircuit(circuit) {
  return JSON.parse(JSON.stringify(circuit));
}

export function validateCircuit(candidate) {
  if (!candidate || candidate.version !== 1 || typeof candidate.id !== "string" || typeof candidate.title !== "string" || typeof candidate.description !== "string" || !Array.isArray(candidate.nodes) || !Array.isArray(candidate.connections) || candidate.nodes.length > 40) {
    return { valid: false, reason: "Unsupported circuit data." };
  }
  const ids = new Set();
  for (const node of candidate.nodes) {
    if (!node || typeof node.id !== "string" || ids.has(node.id) || !COMPONENTS[node.type] || typeof node.label !== "string") {
      return { valid: false, reason: "A component is invalid or duplicated." };
    }
    ids.add(node.id);
  }
  const drivenPorts = new Set();
  for (const connection of candidate.connections) {
    const source = candidate.nodes.find((node) => node.id === connection.from);
    const target = candidate.nodes.find((node) => node.id === connection.to);
    const portKey = `${connection.to}:${connection.toPort}`;
    if (!source || !target || source.type === "output" || !COMPONENTS[target.type].ports.includes(connection.toPort) || drivenPorts.has(portKey)) {
      return { valid: false, reason: "A wire uses an invalid or occupied port." };
    }
    drivenPorts.add(portKey);
  }
  if (hasCycle(candidate.nodes, candidate.connections)) return { valid: false, reason: "Feedback loops are not supported; use a memory component." };
  return { valid: true };
}

function hasCycle(nodes, connections) {
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  connections.forEach(({ from, to }) => {
    outgoing.get(from)?.push(to);
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  });
  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift();
    visited += 1;
    outgoing.get(id)?.forEach((next) => {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    });
  }
  return visited !== nodes.length;
}

export function canConnect(circuit, from, to, toPort) {
  if (from === to) return { valid: false, reason: "A component cannot connect to itself." };
  const source = circuit.nodes.find((node) => node.id === from);
  const target = circuit.nodes.find((node) => node.id === to);
  if (!source || !target || source.type === "output" || !COMPONENTS[target.type].ports.includes(toPort)) {
    return { valid: false, reason: "Those ports cannot be connected." };
  }
  const remaining = circuit.connections.filter((wire) => !(wire.to === to && wire.toPort === toPort));
  const proposed = [...remaining, { id: "candidate", from, to, toPort }];
  if (hasCycle(circuit.nodes, proposed)) return { valid: false, reason: "That wire would create a feedback loop. Use a latch or flip-flop instead." };
  return { valid: true, connections: proposed };
}

function invert(value) {
  return value === UNKNOWN ? UNKNOWN : !value;
}

export function evaluateGate(type, inputs) {
  const [a, b] = inputs;
  if (type === "buffer" || type === "output") return a;
  if (type === "not") return invert(a);
  if (type === "and" || type === "nand") {
    const result = a === false || b === false ? false : a === true && b === true ? true : UNKNOWN;
    return type === "nand" ? invert(result) : result;
  }
  if (type === "or" || type === "nor") {
    const result = a === true || b === true ? true : a === false && b === false ? false : UNKNOWN;
    return type === "nor" ? invert(result) : result;
  }
  if (type === "xor" || type === "xnor") {
    const result = a === UNKNOWN || b === UNKNOWN ? UNKNOWN : a !== b;
    return type === "xnor" ? invert(result) : result;
  }
  return UNKNOWN;
}

export function simulateCircuit(circuit, { advanceClock = false } = {}) {
  if (!validateCircuit(circuit).valid) return new Map();
  if (advanceClock) {
    circuit.nodes.filter((node) => node.type === "clock").forEach((node) => { node.value = !Boolean(node.value); });
  }
  const incoming = new Map(circuit.nodes.map((node) => [node.id, new Map()]));
  const outgoing = new Map(circuit.nodes.map((node) => [node.id, []]));
  const indegree = new Map(circuit.nodes.map((node) => [node.id, 0]));
  circuit.connections.forEach((wire) => {
    incoming.get(wire.to).set(wire.toPort, wire.from);
    outgoing.get(wire.from).push(wire.to);
    indegree.set(wire.to, indegree.get(wire.to) + 1);
  });
  const queue = circuit.nodes.filter((node) => indegree.get(node.id) === 0);
  const values = new Map();

  while (queue.length) {
    const node = queue.shift();
    const ports = COMPONENTS[node.type].ports.map((port) => {
      const source = incoming.get(node.id).get(port);
      return source ? values.get(source) ?? UNKNOWN : UNKNOWN;
    });
    let value = UNKNOWN;
    if (node.type === "input" || node.type === "clock") value = Boolean(node.value);
    else if (node.type === "sr-latch") {
      const [set, reset] = ports;
      if (set === true && reset === true) node.state = UNKNOWN;
      else if (set === true) node.state = true;
      else if (reset === true) node.state = false;
      value = node.state ?? UNKNOWN;
    } else if (node.type === "d-latch") {
      const [data, enable] = ports;
      if (enable === true) node.state = data;
      value = node.state ?? UNKNOWN;
    } else if (node.type === "d-flipflop" || node.type === "t-flipflop") {
      const [data, clock] = ports;
      const rising = node.lastClock === false && clock === true;
      if (rising) {
        if (node.type === "d-flipflop") node.state = data;
        else if (data === true) node.state = node.state === UNKNOWN ? UNKNOWN : !node.state;
        else if (data === UNKNOWN) node.state = UNKNOWN;
      }
      if (clock !== UNKNOWN) node.lastClock = clock;
      value = node.state ?? UNKNOWN;
    } else value = evaluateGate(node.type, ports);
    values.set(node.id, value);
    outgoing.get(node.id).forEach((next) => {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(circuit.nodes.find((item) => item.id === next));
    });
  }
  return values;
}

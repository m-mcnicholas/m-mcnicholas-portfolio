import test from "node:test";
import assert from "node:assert/strict";
import { EXAMPLES } from "../projects/boolean-logic/examples.js";
import {
  UNKNOWN,
  canConnect,
  cloneCircuit,
  createNode,
  evaluateGate,
  simulateCircuit,
  validateCircuit
} from "../projects/boolean-logic/logic-core.js";

test("all combinational gates match their truth tables", () => {
  const rows = [[false, false], [false, true], [true, false], [true, true]];
  const expected = {
    and: [false, false, false, true], or: [false, true, true, true],
    nand: [true, true, true, false], nor: [true, false, false, false],
    xor: [false, true, true, false], xnor: [true, false, false, true]
  };
  for (const [gate, result] of Object.entries(expected)) {
    assert.deepEqual(rows.map((inputs) => evaluateGate(gate, inputs)), result, gate);
  }
  assert.equal(evaluateGate("buffer", [true]), true);
  assert.equal(evaluateGate("not", [true]), false);
});

test("unknown values propagate without hiding decisive AND and OR inputs", () => {
  assert.equal(evaluateGate("and", [UNKNOWN, true]), UNKNOWN);
  assert.equal(evaluateGate("and", [UNKNOWN, false]), false);
  assert.equal(evaluateGate("or", [UNKNOWN, false]), UNKNOWN);
  assert.equal(evaluateGate("or", [UNKNOWN, true]), true);
  assert.equal(evaluateGate("xor", [UNKNOWN, true]), UNKNOWN);
});

test("connection validation rejects feedback and occupied ports remain replaceable", () => {
  const circuit = {
    version: 1, id: "cycle-test", title: "Cycle", description: "",
    nodes: [createNode("and", "a"), createNode("not", "b")],
    connections: [{ id: "one", from: "a", to: "b", toPort: "in" }]
  };
  assert.equal(canConnect(circuit, "b", "a", "a").valid, false);
  assert.equal(canConnect(circuit, "a", "b", "in").valid, true);
});

test("every curated example is valid and produces a value for every node", () => {
  assert.equal(EXAMPLES.length, 10);
  for (const source of EXAMPLES) {
    const example = cloneCircuit(source);
    assert.equal(validateCircuit(example).valid, true, source.id);
    assert.equal(simulateCircuit(example).size, example.nodes.length, source.id);
  }
});

test("D and T flip-flops update only on a rising edge", () => {
  const circuit = cloneCircuit(EXAMPLES.find((example) => example.id === "clocked-memory"));
  let values = simulateCircuit(circuit);
  assert.equal(values.get("dff"), false);
  assert.equal(values.get("tff"), false);
  values = simulateCircuit(circuit, { advanceClock: true });
  assert.equal(values.get("dff"), true);
  assert.equal(values.get("tff"), true);
  values = simulateCircuit(circuit);
  assert.equal(values.get("tff"), true, "remaining at clock high does not retrigger");
  simulateCircuit(circuit, { advanceClock: true });
  values = simulateCircuit(circuit, { advanceClock: true });
  assert.equal(values.get("tff"), false, "the next rising edge toggles again");
});

test("SR latch stores, remembers, resets, and marks the invalid state unknown", () => {
  const circuit = cloneCircuit(EXAMPLES.find((example) => example.id === "sr-memory"));
  const set = circuit.nodes.find((node) => node.id === "set");
  const reset = circuit.nodes.find((node) => node.id === "reset");
  set.value = true;
  assert.equal(simulateCircuit(circuit).get("latch"), true);
  set.value = false;
  assert.equal(simulateCircuit(circuit).get("latch"), true);
  reset.value = true;
  assert.equal(simulateCircuit(circuit).get("latch"), false);
  set.value = true;
  assert.equal(simulateCircuit(circuit).get("latch"), UNKNOWN);
});

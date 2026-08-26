import { cloneCircuit } from "./logic-core.js";

const n = (id, type, label, extra = {}) => ({ id, type, label, ...extra });
const w = (id, from, to, toPort) => ({ id, from, to, toPort });
const circuit = (id, title, description, nodes, connections) => ({ version: 1, id, title, description, nodes, connections });

export const EXAMPLES = [
  circuit("gate-gallery", "Complete gate gallery", "Compare every common gate using the same two inputs.", [
    n("a", "input", "Input A", { value: false }), n("b", "input", "Input B", { value: true }),
    ...["buffer", "not", "and", "or", "nand", "nor", "xor", "xnor"].map((type) => n(type, type, type.toUpperCase())),
    ...["buffer", "not", "and", "or", "nand", "nor", "xor", "xnor"].map((type) => n(`out-${type}`, "output", `${type.toUpperCase()} result`))
  ], [
    w("a-buffer", "a", "buffer", "in"), w("a-not", "a", "not", "in"),
    ...["and", "or", "nand", "nor", "xor", "xnor"].flatMap((type) => [w(`a-${type}`, "a", type, "a"), w(`b-${type}`, "b", type, "b")]),
    ...["buffer", "not", "and", "or", "nand", "nor", "xor", "xnor"].map((type) => w(`${type}-out`, type, `out-${type}`, "in"))
  ]),
  circuit("porch-light", "Porch light", "Either the wall switch or motion sensor turns on the light.", [n("switch", "input", "Wall switch", { value: false }), n("motion", "input", "Motion detected", { value: true }), n("or", "or", "Either trigger"), n("light", "output", "Porch light")], [w("1", "switch", "or", "a"), w("2", "motion", "or", "b"), w("3", "or", "light", "in")]),
  circuit("safety-interlock", "Safety interlock", "The machine runs only when the guard is closed and the stop button is not pressed.", [n("guard", "input", "Guard closed", { value: true }), n("stop", "input", "Stop pressed", { value: false }), n("not", "not", "Stop is clear"), n("and", "and", "Safe to run"), n("motor", "output", "Motor")], [w("1", "stop", "not", "in"), w("2", "guard", "and", "a"), w("3", "not", "and", "b"), w("4", "and", "motor", "in")]),
  circuit("home-alarm", "Armed home alarm", "An open door or window triggers the siren only while the system is armed.", [n("armed", "input", "System armed", { value: true }), n("door", "input", "Door open", { value: false }), n("window", "input", "Window open", { value: true }), n("or", "or", "Entry open"), n("and", "and", "Alarm condition"), n("siren", "output", "Siren")], [w("1", "door", "or", "a"), w("2", "window", "or", "b"), w("3", "or", "and", "a"), w("4", "armed", "and", "b"), w("5", "and", "siren", "in")]),
  circuit("majority", "Two-of-three vote", "The decision passes when at least two voters agree on yes.", [n("a", "input", "Voter A", { value: true }), n("b", "input", "Voter B", { value: true }), n("c", "input", "Voter C", { value: false }), n("ab", "and", "A and B"), n("ac", "and", "A and C"), n("bc", "and", "B and C"), n("or1", "or", "First majority paths"), n("or2", "or", "Any majority"), n("out", "output", "Decision passes")], [w("1", "a", "ab", "a"), w("2", "b", "ab", "b"), w("3", "a", "ac", "a"), w("4", "c", "ac", "b"), w("5", "b", "bc", "a"), w("6", "c", "bc", "b"), w("7", "ab", "or1", "a"), w("8", "ac", "or1", "b"), w("9", "or1", "or2", "a"), w("10", "bc", "or2", "b"), w("11", "or2", "out", "in")]),
  circuit("half-adder", "Half adder", "XOR produces the sum bit while AND produces the carry bit.", [n("a", "input", "Bit A", { value: true }), n("b", "input", "Bit B", { value: true }), n("xor", "xor", "Sum logic"), n("and", "and", "Carry logic"), n("sum", "output", "Sum"), n("carry", "output", "Carry")], [w("1", "a", "xor", "a"), w("2", "b", "xor", "b"), w("3", "a", "and", "a"), w("4", "b", "and", "b"), w("5", "xor", "sum", "in"), w("6", "and", "carry", "in")]),
  circuit("comparator", "One-bit equality", "XNOR reports whether the two bits are equal.", [n("a", "input", "Expected bit", { value: true }), n("b", "input", "Actual bit", { value: true }), n("xnor", "xnor", "Bits match"), n("out", "output", "Equal")], [w("1", "a", "xnor", "a"), w("2", "b", "xnor", "b"), w("3", "xnor", "out", "in")]),
  circuit("parity", "Even-parity checker", "Three XOR stages flag an odd number of true input bits; NOT turns that into an even result.", [n("a", "input", "Bit A", { value: true }), n("b", "input", "Bit B", { value: false }), n("c", "input", "Bit C", { value: true }), n("xor1", "xor", "A differs from B"), n("xor2", "xor", "Odd parity"), n("not", "not", "Even parity"), n("out", "output", "Parity valid")], [w("1", "a", "xor1", "a"), w("2", "b", "xor1", "b"), w("3", "xor1", "xor2", "a"), w("4", "c", "xor2", "b"), w("5", "xor2", "not", "in"), w("6", "not", "out", "in")]),
  circuit("sr-memory", "SR latch memory", "Pulse Set or Reset, then turn it off to see the latch remember its value.", [n("set", "input", "Set", { value: false }), n("reset", "input", "Reset", { value: false }), n("latch", "sr-latch", "Remembered bit", { state: false, lastClock: false }), n("out", "output", "Stored value")], [w("1", "set", "latch", "set"), w("2", "reset", "latch", "reset"), w("3", "latch", "out", "in")]),
  circuit("clocked-memory", "Clocked memory lab", "Compare a transparent D latch with edge-triggered D and T flip-flops.", [n("data", "input", "Data / toggle", { value: true }), n("enable", "input", "Latch enable", { value: true }), n("clock", "clock", "Shared clock", { value: false }), n("dl", "d-latch", "D latch", { state: false, lastClock: false }), n("dff", "d-flipflop", "D flip-flop", { state: false, lastClock: false }), n("tff", "t-flipflop", "T flip-flop", { state: false, lastClock: false }), n("out-dl", "output", "Latch Q"), n("out-dff", "output", "DFF Q"), n("out-tff", "output", "TFF Q")], [w("1", "data", "dl", "data"), w("2", "enable", "dl", "enable"), w("3", "data", "dff", "data"), w("4", "clock", "dff", "clock"), w("5", "data", "tff", "toggle"), w("6", "clock", "tff", "clock"), w("7", "dl", "out-dl", "in"), w("8", "dff", "out-dff", "in"), w("9", "tff", "out-tff", "in")])
];

export function getExample(id) {
  const found = EXAMPLES.find((example) => example.id === id);
  return found ? cloneCircuit(found) : null;
}

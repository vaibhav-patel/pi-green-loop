import type { Check } from "../types.js";
import type { Detector } from "./types.js";

export const rustDetector: Detector = {
  id: "rust",
  matches: (ctx) => ctx.exists("Cargo.toml"),
  detect: () => [
    { id: "rust-typecheck", name: "cargo check", kind: "typecheck", command: "cargo check", enabled: true, source: "rust" },
    { id: "rust-lint", name: "cargo clippy", kind: "lint", command: "cargo clippy", enabled: true, source: "rust" },
    { id: "rust-test", name: "cargo test", kind: "test", command: "cargo test", enabled: true, source: "rust", framework: "cargo" },
    { id: "rust-build", name: "cargo build", kind: "build", command: "cargo build", enabled: true, source: "rust" },
  ],
};

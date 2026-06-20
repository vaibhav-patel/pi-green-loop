import type { Check } from "../types.js";
import type { Detector } from "./types.js";

export const goDetector: Detector = {
  id: "go",
  matches: (ctx) => ctx.exists("go.mod"),
  detect: (ctx) => {
    const checks: Check[] = [
      { id: "go-typecheck", name: "go vet", kind: "typecheck", command: "go vet ./...", enabled: true, source: "go" },
      { id: "go-test", name: "go test", kind: "test", command: "go test ./...", enabled: true, source: "go", framework: "go" },
      { id: "go-build", name: "go build", kind: "build", command: "go build ./...", enabled: true, source: "go" },
    ];
    if (ctx.exists(".golangci.yml") || ctx.exists(".golangci.yaml") || ctx.exists(".golangci.toml")) {
      checks.push({ id: "go-lint", name: "golangci-lint", kind: "lint", command: "golangci-lint run", enabled: true, source: "go" });
    }
    return checks;
  },
};

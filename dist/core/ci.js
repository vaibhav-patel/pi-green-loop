/** Repo-relative path of the GitHub Actions workflow that `init --ci` writes. */
export const CI_WORKFLOW_PATH = ".github/workflows/green.yml";
/**
 * A minimal GitHub Actions workflow that runs the project's checks through pi-green-loop on every
 * push and pull request. Node is set up because pi-green-loop ships as an npm tool; projects in
 * other ecosystems can add their own toolchain setup steps before the final run.
 */
export function ciWorkflowYaml() {
    return `name: green
on:
  push:
  pull_request:
jobs:
  green:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Run checks
        run: npx pi-green-loop check
`;
}
//# sourceMappingURL=ci.js.map
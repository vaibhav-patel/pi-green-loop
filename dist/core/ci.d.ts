/** Repo-relative path of the GitHub Actions workflow that `init --ci` writes. */
export declare const CI_WORKFLOW_PATH = ".github/workflows/green.yml";
/**
 * A minimal GitHub Actions workflow that runs the project's checks through pi-green-loop on every
 * push and pull request. Node is set up because pi-green-loop ships as an npm tool; projects in
 * other ecosystems can add their own toolchain setup steps before the final run.
 */
export declare function ciWorkflowYaml(): string;

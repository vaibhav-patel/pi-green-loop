// MCP server surface for pi-green-loop.
//
// Requires the optional dependencies "@modelcontextprotocol/sdk" and "zod":
//   npm install @modelcontextprotocol/sdk zod
//
// Run via: `npx pi-green-loop mcp` (the CLI imports startServer from here).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { detectChecks, formatReport, loadConfig, reportToAgentFeedback, runChecks, } from "../core/index.js";
const KINDS = ["typecheck", "lint", "test", "build", "custom"];
function summarize(report) {
    const summary = formatReport(report);
    const feedback = reportToAgentFeedback(report);
    return feedback ? `${summary}\n\n${feedback}` : summary;
}
export function createServer() {
    const server = new McpServer({ name: "pi-green-loop", version: "0.1.1" });
    let lastReport;
    server.registerTool("detect_checks", {
        title: "Detect checks",
        description: "List the checks pi-green-loop would run for a project (from pi-green-loop.json or package.json scripts).",
        inputSchema: { cwd: z.string().optional().describe("Project directory (defaults to server cwd).") },
    }, async ({ cwd }) => {
        const dir = cwd ?? process.cwd();
        const checks = detectChecks(dir, loadConfig(dir));
        const text = checks.length === 0
            ? "No checks detected."
            : checks.map((c) => `- ${c.name} (${c.kind}) [${c.source}]: ${c.command}`).join("\n");
        return { content: [{ type: "text", text }] };
    });
    server.registerTool("run_checks", {
        title: "Run checks",
        description: "Run the project's checks and return pass/fail plus the output of any failing check. Use after changing code; if it fails, fix the root cause and run again.",
        inputSchema: {
            cwd: z.string().optional().describe("Project directory (defaults to server cwd)."),
            kinds: z.array(z.enum(KINDS)).optional().describe("Only run checks of these kinds."),
            stopOnFirstFailure: z.boolean().optional(),
        },
    }, async ({ cwd, kinds, stopOnFirstFailure }) => {
        const dir = cwd ?? process.cwd();
        const config = loadConfig(dir);
        let checks = detectChecks(dir, config);
        if (kinds && kinds.length > 0)
            checks = checks.filter((c) => kinds.includes(c.kind));
        lastReport = await runChecks({ cwd: dir, config, checks, stopOnFirstFailure });
        return { content: [{ type: "text", text: summarize(lastReport) }], isError: !lastReport.ok };
    });
    server.registerTool("get_last_report", {
        title: "Get last report",
        description: "Return the result of the most recent run_checks call in this session.",
        inputSchema: {},
    }, async () => {
        const text = lastReport ? summarize(lastReport) : "No checks have been run yet.";
        return { content: [{ type: "text", text }] };
    });
    return server;
}
export async function startServer() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
//# sourceMappingURL=server.js.map
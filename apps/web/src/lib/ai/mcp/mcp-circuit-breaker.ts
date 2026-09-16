// Compatibility shim: moved to @cognix/mcp-core (docs/monorepo.md Phase 4).
// Re-adds the Next.js server-only guard (the package itself must load in
// plain Node) and injects the app logger so output matches pre-extraction.
import "server-only";
import { setMcpCircuitBreakerLogger } from "@cognix/mcp-core/mcp-circuit-breaker";
import { colorize } from "consola/utils";
import globalLogger from "logger";

setMcpCircuitBreakerLogger(
  globalLogger.withDefaults({
    message: colorize("yellow", "[MCP CircuitBreaker]: "),
  }),
);

export {
  isMcpServerCircuitOpen,
  recordMcpServerSuccess,
  recordMcpServerFailure,
} from "@cognix/mcp-core/mcp-circuit-breaker";

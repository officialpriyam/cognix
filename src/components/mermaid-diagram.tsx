"use client";

import { createDebounce } from "lib/utils";
import { Loader } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";

let mermaidModule: typeof import("mermaid").default | null = null;

const loadMermaid = async () => {
  if (!mermaidModule) {
    mermaidModule = (await import("mermaid")).default;
  }
  return mermaidModule;
};

// Common LLM-output issues: node labels contain raw/smart double quotes or chars
// like `?`, `(`, `)` that Mermaid only allows inside quoted labels. We only touch
// labels that actually contain a quote (already-valid charts stay untouched) and wrap
// their content in "..." escaping inner quotes as #quot;.
const SMART_QUOTES = ["\u201C", "\u201D", "\u201E", "\u00AB", "\u00BB", '"'];
function needsQuote(inner: string) {
  return inner.includes('"') || SMART_QUOTES.some((q) => inner.includes(q));
}
function repairMermaid(chart: string): string {
  const wrap = (open: string, close: string, inner: string) => {
    const trimmed = inner.trim();
    if (/^".*"$/.test(trimmed)) return `${open}${inner}${close}`;
    const cleaned = inner
      .replace(/["\u201C\u201D\u201E]/g, "#quot;")
      .replace(/["\u2018\u2019]/g, "#quot;")
      .trim();
    return `${open}"${cleaned}"${close}`;
  };
  let out = chart.replace(/\[([^\][\n]*)\]/g, (m, inner: string) =>
    needsQuote(inner) ? wrap("[", "]", inner) : m,
  );
  out = out.replace(/\{([^}\n]*)\}/g, (m, inner: string) =>
    needsQuote(inner) ? wrap("{", "}", inner) : m,
  );
  out = out.replace(/\((?![\[(])([^)\n]*)\)/g, (m, inner: string) =>
    needsQuote(inner) ? wrap("(", ")", inner) : m,
  );
  return out;
}

async function renderChart(chart: string) {
  const mermaid = await loadMermaid();
  await mermaid.parse(chart);
  const id = `mermaid-${Date.now()}`;
  return await mermaid.render(id, chart);
}

interface MermaidDiagramProps {
  chart?: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const { theme, resolvedTheme } = useTheme();
  const [state, setState] = useState<{
    svg: string;
    error: string | null;
    loading: boolean;
  }>({
    svg: "",
    error: null,
    loading: true,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const previousChartRef = useRef<string>(chart);
  const debounce = useMemo(() => createDebounce(), []);

  useEffect(() => {
    // Reset states if chart has changed
    if (previousChartRef.current !== chart) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      previousChartRef.current = chart;
    }

    // Debounce rendering to avoid flickering during streaming
    debounce(async () => {
      if (!chart?.trim()) {
        setState({ svg: "", error: null, loading: false });
        return;
      }

      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          theme: (resolvedTheme || theme) === "dark" ? "dark" : "default",
          securityLevel: "loose",
        });

        let result: { svg: string };
        try {
          result = await renderChart(chart);
        } catch {
          // Retry with a repaired (auto-quoted) chart before giving up.
          result = await renderChart(repairMermaid(chart));
        }

        setState({ svg: result.svg, error: null, loading: false });
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setState({
          svg: "",
          error:
            err instanceof Error ? err.message : "Failed to render diagram",
          loading: false,
        });
      }
    }, 500);

    return () => {
      debounce.clear();
    };
  }, [chart, theme, resolvedTheme, debounce]);

  if (state.loading) {
    return (
      <div className="px-6 overflow-auto">
        <div className="flex items-center justify-center h-20 w-full">
          <div className="text-muted-foreground flex items-center gap-2">
            Rendering diagram <Loader className="size-4 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="px-6 pb-6 overflow-auto">
        <div className="text-destructive p-4">
          <p>Error rendering Mermaid diagram:</p>
          <pre className="mt-2 p-2 bg-destructive/10 dark:bg-destructive/20 rounded text-xs overflow-auto">
            {state.error}
          </pre>
          <pre className="mt-2 p-2 bg-accent/10 dark:bg-accent/20 rounded text-xs overflow-auto">
            {chart}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 overflow-auto">
      <div
        ref={containerRef}
        className="flex justify-center transition-opacity duration-200 overflow-auto"
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    </div>
  );
}

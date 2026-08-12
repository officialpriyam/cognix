import { createPieChartTool } from "./visualization/create-pie-chart";
import { createBarChartTool } from "./visualization/create-bar-chart";
import { createLineChartTool } from "./visualization/create-line-chart";
import { createTableTool } from "./visualization/create-table";
import { exaSearchTool, exaContentsTool } from "./web/web-search";
import { AppDefaultToolkit, DefaultToolName } from ".";
import { Tool } from "ai";
import { httpFetchTool } from "./http/fetch";
import { jsExecutionTool } from "./code/js-run-tool";
import { pythonExecutionTool } from "./code/python-run-tool";
import { readFileTool } from "./coding/read-file";
import { writeFileTool } from "./coding/write-file";
import { editFileTool } from "./coding/edit-file";
import { listDirectoryTool } from "./coding/list-directory";
import { searchCodeTool } from "./coding/search-code";
import { execCommandTool } from "./coding/exec-command";

export const APP_DEFAULT_TOOL_KIT: Record<
  AppDefaultToolkit,
  Record<string, Tool>
> = {
  [AppDefaultToolkit.Visualization]: {
    [DefaultToolName.CreatePieChart]: createPieChartTool,
    [DefaultToolName.CreateBarChart]: createBarChartTool,
    [DefaultToolName.CreateLineChart]: createLineChartTool,
    [DefaultToolName.CreateTable]: createTableTool,
  },
  [AppDefaultToolkit.WebSearch]: {
    [DefaultToolName.WebSearch]: exaSearchTool,
    [DefaultToolName.WebContent]: exaContentsTool,
  },
  [AppDefaultToolkit.Http]: {
    [DefaultToolName.Http]: httpFetchTool,
  },
  [AppDefaultToolkit.Code]: {
    [DefaultToolName.JavascriptExecution]: jsExecutionTool,
    [DefaultToolName.PythonExecution]: pythonExecutionTool,
  },
  [AppDefaultToolkit.Coding]: {
    [DefaultToolName.ReadFile]: readFileTool,
    [DefaultToolName.WriteFile]: writeFileTool,
    [DefaultToolName.EditFile]: editFileTool,
    [DefaultToolName.ListDirectory]: listDirectoryTool,
    [DefaultToolName.SearchCode]: searchCodeTool,
    [DefaultToolName.ExecCommand]: execCommandTool,
  },
};

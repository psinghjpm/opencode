import { Tool } from "./tool"
import { SessionExport } from "../session/export"
import { Retry } from "../util/retry"
import z from "zod"

export const ExportSessionTool = Tool.define("export_session", {
  description: "Export a session to a file in JSON, Markdown, or HTML format",
  parameters: z.object({
    session_id: z.string().describe("The session ID to export"),
    format: z.enum(["json", "markdown", "html"]).default("json").describe("Output format"),
    output_path: z.string().optional().describe("Custom output file path"),
    include_metadata: z.boolean().default(true).describe("Include session metadata in export"),
  }),
  async execute(args, ctx) {
    const result = await Retry.withRetry(
      () =>
        SessionExport.toFile({
          sessionID: args.session_id,
          format: args.format,
          outputPath: args.output_path,
          includeMetadata: args.include_metadata,
        }),
      { maxAttempts: 3, baseDelayMs: 200 },
    )

    return {
      title: `Exported session to ${result.path}`,
      metadata: {
        path: result.path,
        size: result.size,
        messageCount: result.messageCount,
      },
      output: [
        `Session exported successfully.`,
        `Format: ${args.format}`,
        `Output: ${result.path}`,
        `Size: ${result.size} bytes`,
        `Messages: ${result.messageCount}`,
      ].join("\n"),
    }
  },
})

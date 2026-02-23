import fs from "fs/promises"
import path from "path"
import { Database, eq } from "../storage/db"
import { SessionTable, MessageTable } from "./session.sql"
import { Log } from "../util/log"
import { Global } from "../global"

const log = Log.create({ service: "session-export" })

export namespace SessionExport {
  export type Format = "json" | "markdown" | "html"

  export interface ExportOptions {
    sessionID: string
    format: Format
    outputPath?: string
    includeMetadata?: boolean
  }

  export interface ExportResult {
    path: string
    size: number
    messageCount: number
  }

  /**
   * Export a session to the specified format.
   */
  export async function toFile(options: ExportOptions): Promise<ExportResult> {
    log.info("exporting session", { sessionID: options.sessionID, format: options.format })

    const session = await Database.use((db) =>
      db.select().from(SessionTable).where(eq(SessionTable.id, options.sessionID)).get(),
    )

    if (!session) {
      throw new Error(`Session not found: ${options.sessionID}`)
    }

    const messages = await Database.use((db) =>
      db.select().from(MessageTable).where(eq(MessageTable.session_id, options.sessionID)).all(),
    )

    let content: string

    if (options.format === "json") {
      content = JSON.stringify({ session, messages }, null, 2)
    } else if (options.format === "markdown") {
      content = buildMarkdown(session, messages)
    } else {
      content = buildHtml(session, messages)
    }

    const outputPath = options.outputPath ?? path.join(await Global.path.data(), "exports", `${options.sessionID}.${options.format}`)

    // Ensure export directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, content, "utf-8")

    const stat = await fs.stat(outputPath)

    log.info("session exported", { path: outputPath, size: stat.size })

    return {
      path: outputPath,
      size: stat.size,
      messageCount: messages.length,
    }
  }

  /**
   * Export session to a string without writing to disk.
   */
  export async function toString(sessionID: string, format: Format): Promise<string> {
    const session = await Database.use((db) =>
      db.select().from(SessionTable).where(eq(SessionTable.id, sessionID)).get(),
    )
    const messages = await Database.use((db) =>
      db.select().from(MessageTable).where(eq(MessageTable.session_id, sessionID)).all(),
    )

    if (format === "json") {
      return JSON.stringify({ session, messages })
    } else if (format === "markdown") {
      return buildMarkdown(session, messages)
    } else {
      return buildHtml(session, messages)
    }
  }

  function buildMarkdown(session: any, messages: any[]): string {
    let md = `# Session: ${session.title}\n\n`
    md += `**ID:** ${session.id}\n`
    md += `**Created:** ${new Date(session.time_created).toISOString()}\n\n`
    md += `---\n\n`

    for (const msg of messages) {
      const role = msg.role === "user" ? "**User**" : "**Assistant**"
      md += `## ${role}\n\n`
      md += `${msg.content}\n\n`
    }

    return md
  }

  function buildHtml(session: any, messages: any[]): string {
    let html = `<!DOCTYPE html><html><head><title>${session.title}</title></head><body>\n`
    html += `<h1>${session.title}</h1>\n`
    html += `<p>Session ID: ${session.id}</p>\n`

    for (const msg of messages) {
      const role = msg.role === "user" ? "User" : "Assistant"
      html += `<div class="${msg.role}">\n`
      html += `  <strong>${role}:</strong>\n`
      html += `  <p>${msg.content}</p>\n`
      html += `</div>\n`
    }

    html += `</body></html>`
    return html
  }

  /**
   * List all exported files.
   */
  export async function listExports(): Promise<string[]> {
    const exportDir = path.join(await Global.path.data(), "exports")
    try {
      const files = await fs.readdir(exportDir)
      return files.map((f) => path.join(exportDir, f))
    } catch {
      return []
    }
  }

  /**
   * Delete an export file.
   */
  export async function deleteExport(filePath: string): Promise<void> {
    await fs.unlink(filePath)
    log.info("export deleted", { path: filePath })
  }
}

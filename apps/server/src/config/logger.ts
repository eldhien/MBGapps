function write(stream: NodeJS.WriteStream, level: string, message: string) {
  stream.write(`[${level}] ${message}\n`)
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ""}`.trim()
  }

  return String(error)
}

export const logger = {
  error(message: string, error?: unknown) {
    write(
      process.stderr,
      "error",
      error ? `${message}\n${formatError(error)}` : message
    )
  },
  info(message: string) {
    write(process.stdout, "info", message)
  },
}

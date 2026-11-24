/**
 * Reads the local ElasticMQ queue the backend publishes emails to. Only reads: the ReceiveMessage query uses
 * VisibilityTimeout=0, so nothing disappears and no other spec's message is purged.
 */
// E2E_MAIL_QUEUE_URL: the email queue of the stack under test (default: the local stack's ElasticMQ)
const QUEUE_URL =
  (process.env.E2E_MAIL_QUEUE_URL ?? "http://localhost:19324/000000000000/email-verification") +
  "?Action=ReceiveMessage&MaxNumberOfMessages=10&VisibilityTimeout=0&Version=2012-11-05"

/** The Body of an SQS message is XML-escaped JSON (&quot; for the quotes). &amp; is decoded last. */
function decodeXml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
}

type QueueMessage = { body: string }

async function readQueue(): Promise<QueueMessage[]> {
  const response = await fetch(QUEUE_URL)
  if (!response.ok) {
    throw new Error(`ElasticMQ ReceiveMessage failed: ${response.status} ${await response.text()}`)
  }
  const xml = await response.text()
  const messages: QueueMessage[] = []
  // Keep each Body paired with its own <Message> block (verification mails share the queue).
  for (const block of xml.match(/<Message>[\s\S]*?<\/Message>/g) ?? []) {
    const body = block.match(/<Body>([\s\S]*?)<\/Body>/)?.[1]
    if (body) messages.push({ body: decodeXml(body) })
  }
  return messages
}

async function resetLinksFor(email: string): Promise<string[]> {
  const links: string[] = []
  for (const message of await readQueue()) {
    let parsed: unknown
    try {
      parsed = JSON.parse(message.body)
    } catch {
      continue // not JSON (an old plain-text mail)
    }
    const body = parsed as { type?: unknown; email?: unknown; url?: unknown }
    if (body.type === "password-reset" && body.email === email && typeof body.url === "string") {
      links.push(body.url)
    }
  }
  return links
}

/** Links already queued for an email: take a baseline before asking for a new one. */
export async function passwordResetLinks(email: string): Promise<string[]> {
  return resetLinksFor(email)
}

/**
 * Polls the queue until a password-reset mail for this email appears (up to ~15 s) and returns its URL. Links in
 * `excludeUrls` were already in the queue before the request, so a re-run never hands back a token already used.
 * The origin of the URL is the old dev server (localhost:5173); the caller opens only its path and query.
 */
export async function latestPasswordResetLink(
  email: string,
  excludeUrls: readonly string[] = [],
): Promise<string> {
  const deadline = Date.now() + 15_000
  let seen: string[] = []
  while (Date.now() < deadline) {
    seen = await resetLinksFor(email)
    const fresh = seen.filter((url) => !excludeUrls.includes(url))
    if (fresh.length > 0) return fresh[fresh.length - 1]
    await new Promise((resolve) => setTimeout(resolve, 200)) // polling interval, not a UI wait
  }
  throw new Error(
    `No password-reset email for ${email} reached the local queue in 15 s (saw: ${seen.join(", ") || "nothing"})`,
  )
}

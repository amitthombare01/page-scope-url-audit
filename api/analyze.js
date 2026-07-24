const TIMEOUT_MS = 10000;
const MAX_HTML_SIZE = 2_000_000;

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
      const numeric = code[0].toLowerCase() === "x"
        ? Number.parseInt(code.slice(1), 16)
        : Number.parseInt(code, 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : _;
    });
}

function textFromHtml(html) {
  return decodeHtml(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function firstTagContent(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? textFromHtml(match[1]) : "";
}

function parseAudit(html) {
  const title = firstTagContent(html, "title") || null;
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const descriptionTag = metaTags.find((tag) => {
    const name = attribute(tag, "name");
    return name && name.toLowerCase() === "description";
  });
  const metaDescription = descriptionTag ? decodeHtml(attribute(descriptionTag, "content") || "").trim() || null : null;
  const h1Count = (html.match(/<h1\b[^>]*>/gi) || []).length;
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  const imagesMissingAlt = imageTags.filter((tag) => {
    const alt = attribute(tag, "alt");
    return alt === null || !alt.trim();
  }).length;
  const wordCount = textFromHtml(html).match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu)?.length || 0;

  const approximateWordCount = textFromHtml(html).match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu)?.length || 0;

  return { title, metaDescription, h1Count, imagesMissingAlt, wordCount: approximateWordCount };
}

function send(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed. Use POST." });
  }

  const submittedUrl = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  let url;
  try {
    url = new URL(submittedUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("Unsupported protocol");
  } catch {
    return send(res, 400, { error: "Enter a valid http:// or https:// URL." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Digital-Heroes-URL-Audit/1.0",
        "Accept": "text/html,application/xhtml+xml"
      }
    });
    const responseTime = Math.round(performance.now() - startedAt);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("text/html") && !contentType.toLowerCase().includes("application/xhtml+xml")) {
      return send(res, 422, {
        error: "The URL responded successfully, but it is not an HTML page.",
        status: response.status,
        responseTime,
        contentType: contentType || "unknown"
      });
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_HTML_SIZE) {
      return send(res, 413, { error: "This HTML page is too large to audit safely.", status: response.status, responseTime });
    }

    const html = await response.text();
    if (html.length > MAX_HTML_SIZE) {
      return send(res, 413, { error: "This HTML page is too large to audit safely.", status: response.status, responseTime });
    }
    return send(res, 200, {
      url: response.url,
      status: response.status,
      responseTime,
      ...parseAudit(html)
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return send(res, 504, { error: "The site took longer than 10 seconds to respond. Please try again." });
    }
    return send(res, 502, { error: "We could not fetch that URL. It may be unavailable or blocking requests." });
  } finally {
    clearTimeout(timeout);
  }
}

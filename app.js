document.title = "PageScope — URL Audit";

const form = document.querySelector("#audit-form");
const input = document.querySelector("#url");
const button = form.querySelector("button");
const errorMessage = document.querySelector("#error");
const report = document.querySelector("#report");

const fields = {
  url: document.querySelector("#report-url"),
  status: document.querySelector("#status-badge"),
  responseTime: document.querySelector("#response-time"),
  title: document.querySelector("#page-title-result"),
  description: document.querySelector("#meta-description"),
  h1: document.querySelector("#h1-count"),
  missingAlt: document.querySelector("#missing-alt"),
  wordCount: document.querySelector("#word-count")
};

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  report.hidden = true;
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.classList.toggle("loading", isLoading);
  input.disabled = isLoading;
}

function compactUrl(url) {
  try { return new URL(url).host; } catch { return url; }
}

function renderReport(data) {
  fields.url.textContent = compactUrl(data.url);
  fields.status.textContent = `HTTP ${data.status}`;
  fields.status.className = `status-badge ${data.status >= 200 && data.status < 400 ? "good" : "warning"}`;
  fields.responseTime.textContent = `${data.responseTime.toLocaleString()} ms`;
  fields.title.textContent = data.title || "Not found";
  fields.description.textContent = data.metaDescription || "Not found";
  fields.h1.textContent = data.h1Count.toLocaleString();
  fields.missingAlt.textContent = data.imagesMissingAlt.toLocaleString();
  fields.wordCount.textContent = data.wordCount.toLocaleString();
  errorMessage.hidden = true;
  report.hidden = false;
  report.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = input.value.trim();
  if (!url) return showError("Please enter a URL to audit.");
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return showError("Enter a valid URL beginning with http:// or https://.");
  }

  setLoading(true);
  errorMessage.hidden = true;
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong while analyzing this page.");
    renderReport(data);
  } catch (error) {
    showError(error.message || "Something unexpected happened. Please try again.");
  } finally {
    setLoading(false);
  }
});

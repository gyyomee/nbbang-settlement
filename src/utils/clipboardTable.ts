export async function writeTableToClipboard({
  html,
  plainText,
}: {
  html: string;
  plainText: string;
}) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard.write) {
    await navigator.clipboard.writeText(plainText);
    return;
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    }),
  ]);
}

export function buildClipboardHtmlTable({
  headers,
  rows,
  sectionTitle,
  title,
}: {
  headers: string[];
  rows: string[][];
  sectionTitle: string;
  title: string;
}) {
  return [
    "<!doctype html>",
    "<html>",
    "<body>",
    `<p>${escapeHtml(title)}</p>`,
    `<p>${escapeHtml(sectionTitle)}</p>`,
    "<table>",
    "<thead>",
    `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`,
    "</thead>",
    "<tbody>",
    ...rows.map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    ),
    "</tbody>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}

export function sanitizeTableCell(value: string) {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

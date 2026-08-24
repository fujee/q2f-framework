import type { QuestionDefinition } from '@/domain/qd/model'
import type { QuestionFormDefinition } from '@/domain/qfd/model'
import { buildHtmlFragment, escapeHtml } from './htmlFragment'

/** Print styles for the paper medium: A4 pages, margins, and a clean white
 * sheet. The browser's print dialog then saves it as a PDF. */
const PAPER_STYLE = `
@page { size: A4; margin: 14mm; }
html, body { margin: 0; padding: 0; background: #e8e8e8; }
.qfd-page {
  width: 180mm;
  min-height: 257mm;
  margin: 12px auto;
  background: #fff;
  padding: 12mm;
  box-sizing: border-box;
  box-shadow: 0 1px 4px rgba(0,0,0,.25);
}
@media print {
  html, body { background: #fff; }
  .qfd-page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
}
`

/** Opens a new window with the paper rendering of the form and triggers the
 * print dialog so the user can save it as a PDF. */
export function openPaperPdf(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): void {
  const title = `${qd.shortDescription ?? 'Question form'} — ${qfd.targetProfileRef}`
  const body = buildHtmlFragment(qd, qfd)

  const doc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${PAPER_STYLE}</style>
  </head>
  <body>
    <div class="qfd-page">${body}</div>
    <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
  </body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(doc)
  win.document.close()
}

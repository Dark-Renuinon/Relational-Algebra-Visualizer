import { useState } from 'react';
import { createDocxReport, createPdfReport, createReportData, createTextReport, downloadBlob } from '../engine/reports';

export default function ReportDownload({ execution, onNotice }) {
  const [busy, setBusy] = useState('');
  const hasExecution = Boolean(execution?.result?.relation);

  async function download(format) {
    if (!hasExecution) {
      onNotice({ type: 'error', text: 'Run a valid query before downloading a report.' });
      return;
    }
    setBusy(format);
    try {
      const data = createReportData(execution);
      const name = 'relational-algebra-execution-report';
      if (format === 'txt') downloadBlob(`${name}.txt`, new Blob([createTextReport(data)], { type: 'text/plain;charset=utf-8' }));
      if (format === 'docx') downloadBlob(`${name}.docx`, createDocxReport(data));
      if (format === 'pdf') downloadBlob(`${name}.pdf`, await createPdfReport(data));
      onNotice({ type: 'success', text: `${format.toUpperCase()} report downloaded from the current execution.` });
    } catch (error) {
      onNotice({ type: 'error', text: `Could not create the report: ${error.message}` });
    } finally { setBusy(''); }
  }

  return (
    <section className="report-download" id="download" aria-labelledby="download-heading">
      <div><span className="eyebrow">Execution report</span><h3 id="download-heading">Download your current result</h3><p>{hasExecution ? 'The report includes the entered query, source relation snapshots, actual processing steps, intermediate tables, and final output.' : 'Run a valid expression first. Download options will then use that specific execution, never a sample report.'}</p></div>
      <div className="report-actions">
        {hasExecution ? <>{['pdf', 'docx', 'txt'].map((format) => <button type="button" key={format} onClick={() => download(format)} disabled={Boolean(busy)}>{busy === format ? 'Preparing…' : format.toUpperCase()}</button>)}</> : <span className="report-empty">No execution yet</span>}
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { REPORT_REASONS, REPORT_REASON_LABELS, LIMITS, type ReportReason } from '@vybe/shared';
import { Icon } from './Icon';

interface ReportSheetProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onReport: (reason: ReportReason, details: string) => void;
  onBlock: () => void;
}

export function ReportSheet({ open, busy, onClose, onReport, onBlock }: ReportSheetProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (open) {
      setReason(null);
      setDetails('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 id="report-title" className="text-[17px] font-bold">
            Report this user
          </h2>
          <button className="icon-btn" type="button" aria-label="Close" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 12 }}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Tell us what happened. Your report and the latest chat messages are sent to our safety team. The other person is never told who reported them.
        </p>

        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Reason">
          {REPORT_REASONS.map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={reason === r} onClick={() => setReason(r)}>
              {REPORT_REASON_LABELS[r]}
            </button>
          ))}
        </div>

        <textarea
          className="textarea mb-3"
          placeholder="Add details (optional)"
          maxLength={LIMITS.maxReportDetails}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          aria-label="Details"
        />

        <div className="flex gap-2">
          <button className="btn-light flex flex-1 items-center justify-center gap-2" type="button" disabled={busy} onClick={onBlock}>
            <Icon name="block" size={17} /> Block
          </button>
          <button
            className="btn-danger flex flex-[1.6] items-center justify-center gap-2"
            type="button"
            disabled={busy || reason === null}
            onClick={() => reason && onReport(reason, details)}
          >
            <Icon name="flag" size={17} /> Report &amp; next
          </button>
        </div>
      </div>
    </div>
  );
}

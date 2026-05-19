import type { ChartModalProps } from '../types';

export default function ChartModal({ date, onClose, children }: ChartModalProps) {
  return (
    <div className="news-modal-overlay" onClick={onClose}>
      <div className="news-modal" onClick={(e) => e.stopPropagation()}>
        <div className="news-modal-header">
          <span className="news-modal-date">{date}</span>
          <button className="news-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="news-modal-list">{children}</div>
      </div>
    </div>
  );
}

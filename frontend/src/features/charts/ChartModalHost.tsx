import ChartModal from './components/ChartModal';
import type { ModalState } from './usePluginClickModal';

type ChartModalHostProps = {
  modal: ModalState | null;
  onClose: () => void;
};

/**
 * Renders the marker-click modal when a plugin returns content from
 * `onMarkerClick`. Falls back to the click date as header text if the
 * plugin didn't supply its own `title`.
 */
export function ChartModalHost({ modal, onClose }: ChartModalHostProps) {
  if (!modal) return null;
  return (
    <ChartModal date={modal.title ?? modal.date} onClose={onClose}>
      {modal.body}
    </ChartModal>
  );
}

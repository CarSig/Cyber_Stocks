export default function StateHandler({ isPending, error, empty, emptyMessage, loadingMessage, children }) {
  if (isPending) {
    return <p className="ti-loading">{loadingMessage ?? 'Loading…'}</p>;
  }

  if (error) {
    return <p className="ti-error">{error.message}</p>;
  }

  if (empty) {
    return <p className="ti-empty">{emptyMessage ?? 'No data'}</p>;
  }

  return children;
}

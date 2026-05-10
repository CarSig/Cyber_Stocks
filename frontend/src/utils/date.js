export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

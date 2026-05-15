export const formatDate = (iso: string | null | undefined): string => (iso ? new Date(iso).toLocaleDateString() : '—');

export const formatDateTime = (iso: string | null | undefined): string => (iso ? new Date(iso).toLocaleString() : '—');

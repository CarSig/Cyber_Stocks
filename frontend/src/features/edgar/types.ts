export type DownloadProps = {
  selectedTicker: string | null;
  onTickerChange: (t: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
};

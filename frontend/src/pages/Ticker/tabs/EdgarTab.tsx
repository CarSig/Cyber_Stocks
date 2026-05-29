import '@/pages/EdgarArchive/EdgarArchive.css';
import SecFilingImpactTable from '@/features/edgar/components/SecFilingImpactTable';

type Props = { ticker: string };

export default function EdgarTab({ ticker }: Props) {
  return <SecFilingImpactTable ticker={ticker} />;
}

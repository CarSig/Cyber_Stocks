import Page from '@/components/atoms/Page';
import IntradaySimulation from '@/components/organisms/ticker/IntradaySimulation';
import '@/pages/Alpaca/Alpaca.css';

export default function Events() {
  return (
    <Page>
      <IntradaySimulation />
    </Page>
  );
}

import Page from '@/components/common/Page';
import IntradaySimulation from '@/features/simulations/IntradaySimulation';

export default function Events() {
  return (
    <Page>
      <IntradaySimulation mode="event" />
    </Page>
  );
}

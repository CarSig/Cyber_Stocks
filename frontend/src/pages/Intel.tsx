import { Link } from 'react-router-dom';
import Page from '@/components/common/layout/Page';
import BaseCard from '@/components/common/cards/BaseCard';
import CardHeader from '@/components/common/cards/CardHeader';

type IntelCardProps = {
  to: string;
  icon: string;
  title: string;
  description: string;
};

function IntelCard({ to, icon, title, description }: IntelCardProps) {
  return (
    <BaseCard variant="interactive" as={Link} to={to}>
      <CardHeader icon={icon} title={title} />
      <div className="ti-card-body">
        <p className="ti-empty ti-empty-no-top">{description}</p>
      </div>
    </BaseCard>
  );
}

export default function Intel() {
  return (
    <Page title="Intel">
      <div className="ti-grid">
        <IntelCard
          to="/threat-intel"
          icon="🛡"
          title="Threat Intel"
          description="KEV, NVD, OTX, and MISP threat intelligence feeds"
        />
        <IntelCard
          to="/socials"
          icon="💬"
          title="Socials"
          description="Truth Social and Reddit posts with sentiment analysis"
        />
        <IntelCard
          to="/cyber-news"
          icon="📰"
          title="Cyber News"
          description="Archived cybersecurity news matched to tracked companies"
        />
        <IntelCard
          to="/intelligence"
          icon="🧠"
          title="News Intelligence"
          description="AI-extracted entities and per-entity sentiment from news"
        />
      </div>
    </Page>
  );
}

import { cn } from '@/lib/utils';

type SkeletonProps = React.ComponentPropsWithoutRef<'div'>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };

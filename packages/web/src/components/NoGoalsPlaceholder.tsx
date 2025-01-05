import { Trans } from '@lingui/react/macro';

import { CDN_URL } from '~/constants';
import { cn } from '~/utils';

export interface NoGoalsPlaceholderProps {
  onClick: () => void;
  className?: string;
}

const NoGoalsPlaceholder = ({ onClick, className }: NoGoalsPlaceholderProps) => (
  <div
    className={cn(
      'animate-delayed-fade-in mx-auto flex flex-col items-center opacity-0',
      className,
    )}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onClick();
      }
    }}
  >
    <img
      src={`${CDN_URL}/hatching_chick.webp`}
      alt="Hatching Chick"
      width="200"
      height="200"
      loading="lazy"
      // FIXME: change spelling to `fetchPriority` after upgrading to React 19
      fetchpriority="high"
    />
    <h4 className="mb-2 text-3xl">
      <Trans>There are no goals.</Trans>
    </h4>
    <p className="text-muted-foreground text-center">
      <Trans>Create your first goal!</Trans>
    </p>
  </div>
);

export default NoGoalsPlaceholder;

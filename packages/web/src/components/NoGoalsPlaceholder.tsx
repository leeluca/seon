import { Trans } from '@lingui/react/macro';

import { CDN_URL } from '~/constants';
import type { GoalFilter } from '~/types/goal';
import { cn } from '~/utils';

const content = {
  all: {
    image: 'hatching_chick.webp',
    title: <Trans>There are no goals.</Trans>,
    description: <Trans>Create your first goal!</Trans>,
  },
  ongoing: {
    image: 'side_baby_chick.webp',
    title: <Trans>No goals in progress.</Trans>,
    description: <Trans>Create a new goal or change the filter!</Trans>,
  },
  completed: {
    image: 'front_baby_chick.webp',
    title: <Trans>No completed goals yet.</Trans>,
    description: (
      <Trans>
        Keep working on your goals!
        <br />
        Change the filter to see all goals.
      </Trans>
    ),
  },
};

export interface NoGoalsPlaceholderProps {
  onClick: () => void;
  className?: string;
  filter: GoalFilter;
}
function NoGoalsPlaceholder({
  onClick,
  className,
  filter,
}: NoGoalsPlaceholderProps) {
  const { image, title, description } = content[filter];

  return (
    <button
      type="button"
      className={cn(
        'animate-delayed-fade-in mx-auto flex flex-col items-center opacity-0',
        className,
        filter === 'completed' && 'pointer-events-none',
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <img
        src={`${CDN_URL}/${image}`}
        alt="Hatching Chick"
        width="200"
        height="200"
        // FIXME: change spelling to `fetchPriority` after upgrading to React 19
        // biome-ignore lint/nursery/noTsIgnore: need to upgrade to React 19
        //@ts-ignore
        fetchpriority="high"
      />
      <h4 className="mb-2 text-3xl">{title}</h4>
      <p className="text-muted-foreground text-center">{description}</p>
    </button>
  );
}

export default NoGoalsPlaceholder;

import { type ReactNode, useState } from 'react';
import { Trans } from '@lingui/react/macro';

import frontBabyChick from '~/assets/front_baby_chick.webp';
import hatchingChick from '~/assets/hatching_chick.webp';
import sideBabyChick from '~/assets/side_baby_chick.webp';
import type { GoalFilter } from '~/features/goal/model';
import { cn } from '~/utils';

const content: Record<
  GoalFilter,
  { image: string; title: ReactNode; description: ReactNode }
> = {
  all: {
    image: hatchingChick,
    title: <Trans>There are no goals.</Trans>,
    description: <Trans>Create your first goal!</Trans>,
  },
  ongoing: {
    image: sideBabyChick,
    title: <Trans>No goals in progress.</Trans>,
    description: <Trans>Create a new goal or change the filter!</Trans>,
  },
  completed: {
    image: frontBabyChick,
    title: <Trans>No completed goals yet.</Trans>,
    description: (
      <Trans>
        Keep working on your goals!
        <br />
        Change the filter to see all goals.
      </Trans>
    ),
  },
  archived: {
    image: sideBabyChick,
    title: <Trans>No archived goals.</Trans>,
    description: (
      <Trans>
        Archived goals will appear here.
        <br />
        Switch filters to view active goals.
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
  const { image: src, title, description } = content[filter];
  // Stay hidden until the image settles so the text and image appear together.
  // Tracked per src so switching filters waits for the new image too.
  const [settledSrc, setSettledSrc] = useState<string>();
  const reveal = () => setSettledSrc(src);

  return (
    <button
      type="button"
      className={cn(
        'mx-auto flex flex-col items-center',
        settledSrc === src ? 'animate-fade-in' : 'opacity-0',
        className,
        (filter === 'completed' || filter === 'archived') &&
          'pointer-events-none',
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <img
        src={src}
        alt=""
        width="200"
        height="200"
        fetchPriority="high"
        onLoad={reveal}
        onError={reveal}
      />
      <h4 className="mb-2 text-3xl">{title}</h4>
      <p className="text-muted-foreground text-center">{description}</p>
    </button>
  );
}

export default NoGoalsPlaceholder;

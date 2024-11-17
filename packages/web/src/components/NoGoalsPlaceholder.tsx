import { CDN_URL } from '~/constants';

const NoGoalsPlaceholder = ({ onClick }: { onClick: () => void }) => (
  <div
    className="animate-delayed-fade-in mx-auto flex flex-col items-center opacity-0"
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
      // eslint-disable-next-line react/no-unknown-property
      fetchpriority="high"
    />
    <h4 className="mb-2 text-3xl">There are no goals</h4>
    <p className="text-muted-foreground text-center">Create your first goal!</p>
  </div>
);

export default NoGoalsPlaceholder;

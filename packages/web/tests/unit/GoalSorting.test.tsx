import { describe, expect, it, vi } from 'vitest';

import { GoalSorting } from '~/features/goal/components/GoalSorting';
import type { GoalSort } from '~/features/goal/model';
import { act, fireEvent, customRender as render, screen } from '../test-utils';

describe('GoalSorting', () => {
  it('renders with the current sort option displayed', () => {
    const setSort = vi.fn();
    render(<GoalSorting sort="createdAt desc" setSort={setSort} />);

    expect(screen.getByText('Newest first')).toBeInTheDocument();
  });

  it('opens popover when clicked', async () => {
    const setSort = vi.fn();
    render(<GoalSorting sort="createdAt desc" setSort={setSort} />);

    const button = screen.getByRole('listbox');
    fireEvent.click(button);

    expect(await screen.findByText('Oldest first')).toBeInTheDocument();
    expect(await screen.findByText('Name (A to Z)')).toBeInTheDocument();
  });

  it('calls setSort with the correct value when an option is selected', async () => {
    const setSort = vi.fn();
    render(<GoalSorting sort="createdAt desc" setSort={setSort} />);

    const button = screen.getByRole('listbox');
    fireEvent.click(button);

    const oldestOption = await screen.findByText('Oldest first');

    await act(async () => {
      fireEvent.click(oldestOption);
    });

    expect(setSort).toHaveBeenCalledWith('createdAt asc');
  });

  it('updates the database when an option is selected', async () => {
    const dbMock = await import('~/data/db/database');
    const userStoreMock = await import('~/states/stores/userStore');

    const setSort = vi.fn();
    render(<GoalSorting sort="createdAt desc" setSort={setSort} />);

    const button = screen.getByRole('listbox');
    fireEvent.click(button);

    const azSortOption = await screen.findByText('Name (A to Z)');

    await act(async () => {
      fireEvent.click(azSortOption);
    });

    expect(dbMock.default.updateTable).toHaveBeenCalled();
    expect(
      userStoreMock.useUserStore.getState().setPreferences,
    ).toHaveBeenCalled();
  });

  it('displays fallback text when sort parameter is not in the options', () => {
    const setSort = vi.fn();
    render(
      <GoalSorting sort={'unknown value' as GoalSort} setSort={setSort} />,
    );

    expect(screen.getByText('Select sort...')).toBeInTheDocument();
  });

  it('shows correct icon based on sort parameter', () => {
    const setSort = vi.fn();
    render(<GoalSorting sort="title desc" setSort={setSort} />);

    expect(screen.getByText('Name (Z to A)')).toBeInTheDocument();
  });
});

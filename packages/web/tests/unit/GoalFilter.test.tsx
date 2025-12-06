import { describe, expect, it, vi } from 'vitest';

import { GoalFilter } from '~/components/GoalFilter';
import { act, fireEvent, customRender as render, screen } from '../test-utils';

describe('GoalFilter', () => {
  it('renders with the current filter displayed', () => {
    const setFilter = vi.fn();
    render(<GoalFilter filter="all" setFilter={setFilter} />);

    expect(screen.getByText('All Goals')).toBeInTheDocument();
  });

  it('opens popover when clicked', async () => {
    const setFilter = vi.fn();
    render(<GoalFilter filter="all" setFilter={setFilter} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(await screen.findByText('Ongoing')).toBeInTheDocument();
  });

  it('calls setFilter with the correct value when an option is selected', async () => {
    const setFilter = vi.fn();
    render(<GoalFilter filter="all" setFilter={setFilter} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const completedOption = await screen.findByText('Completed');

    await act(async () => {
      fireEvent.click(completedOption);
    });

    expect(setFilter).toHaveBeenCalledWith('completed');
  });

  it('updates the database when an option is selected', async () => {
    const dbMock = await import('~/data/db/database');
    const userStoreMock = await import('~/states/stores/userStore');

    const setFilter = vi.fn();
    render(<GoalFilter filter="all" setFilter={setFilter} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const ongoingOption = await screen.findByText('Ongoing');

    await act(async () => {
      fireEvent.click(ongoingOption);
    });

    expect(dbMock.default.updateTable).toHaveBeenCalled();
    expect(
      userStoreMock.useUserStore.getState().setPreferences,
    ).toHaveBeenCalled();
  });

  it('displays filter value when selected', async () => {
    const setFilter = vi.fn();
    render(<GoalFilter filter="ongoing" setFilter={setFilter} />);

    expect(screen.getByText('Ongoing')).toBeInTheDocument();
  });
});

import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { describe, expect, it, vi } from 'vitest';

import { GoalSorting } from '~/components/GoalSorting';
import { messages as enMessages } from '~/locales/en/messages';
import { messages as koMessages } from '~/locales/ko/messages';
import type { GoalSort } from '~/types/goal';
import { act, fireEvent, customRender as render, screen } from '../test-utils';

i18n.load({
  en: enMessages,
  ko: koMessages,
});
i18n.activate('en');
const TestingI18nProvider = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

describe('GoalSorting', () => {
  it('renders with the current sort option displayed', () => {
    const setSort = vi.fn();
    render(<GoalSorting sort="createdAt desc" setSort={setSort} />, {
      wrapper: TestingI18nProvider,
    });

    expect(screen.getByText('Newest first')).toBeInTheDocument();
  });

  it('opens popover when clicked', async () => {
    const setSort = vi.fn();
    render(<GoalSorting sort="createdAt desc" setSort={setSort} />, {
      wrapper: TestingI18nProvider,
    });

    const button = screen.getByRole('listbox');
    fireEvent.click(button);

    expect(await screen.findByText('Oldest first')).toBeInTheDocument();
    expect(await screen.findByText('Name (A to Z)')).toBeInTheDocument();
  });

  it('calls setSort with the correct value when an option is selected', async () => {
    const setSort = vi.fn();
    render(<GoalSorting sort="createdAt desc" setSort={setSort} />, {
      wrapper: TestingI18nProvider,
    });

    const button = screen.getByRole('listbox');
    fireEvent.click(button);

    const oldestOption = await screen.findByText('Oldest first');

    await act(async () => {
      fireEvent.click(oldestOption);
    });

    expect(setSort).toHaveBeenCalledWith('createdAt asc');
  });

  it('updates the database when an option is selected', async () => {
    const dbMock = await import('~/lib/database');
    const userStoreMock = await import('~/states/stores/userStore');

    const setSort = vi.fn();
    render(<GoalSorting sort="createdAt desc" setSort={setSort} />, {
      wrapper: TestingI18nProvider,
    });

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
      { wrapper: TestingI18nProvider },
    );

    expect(screen.getByText('Select sort...')).toBeInTheDocument();
  });

  it('shows correct icon based on sort parameter', () => {
    const setSort = vi.fn();
    render(<GoalSorting sort="title desc" setSort={setSort} />, {
      wrapper: TestingI18nProvider,
    });

    expect(screen.getByText('Name (Z to A)')).toBeInTheDocument();
  });
});

import '@testing-library/jest-dom';

import { cleanup } from './test-utils';

vi.mock('~/lib/database', () => ({
  default: {
    updateTable: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          execute: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    })),
  },
}));

vi.mock('~/states/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn().mockReturnValue({
      user: { id: 'test-user-id' },
      userPreferences: {},
      setPreferences: vi.fn(),
    }),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

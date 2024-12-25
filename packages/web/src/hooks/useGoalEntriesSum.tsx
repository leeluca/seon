import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

import db from '~/lib/database';

// FIXME: currently, if any entry is modified the entries for all the goals are updated
function useGoalEntriesSum(goalId: string) {
  const { data: entriesSum, isLoading } = useQuery(
    db
      .selectFrom('entry')
      .select(db.fn.sum('value').as('totalValue'))
      .where('goalId', '=', goalId),
  );
  const totalValue = Number(entriesSum[0]?.totalValue) || 0;
  const result = useMemo(
    () => ({
      value: totalValue,
      isLoading,
    }),
    [totalValue, isLoading],
  );

  return result;
}

export default useGoalEntriesSum;

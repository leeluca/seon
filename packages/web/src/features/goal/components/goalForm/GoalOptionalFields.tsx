import { useId, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronRightIcon } from 'lucide-react';

import { MAX_INPUT_NUMBER, MAX_UNIT_LENGTH } from '~/constants';
import { goalFormOptions } from '~/features/goal/model/form';
import { Button } from '~/shared/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/shared/components/ui/collapsible';
import { maxLengthValidator } from '~/utils/validation';
import { withForm } from '../../hooks/useGoalForm';

export const GoalOptionalFields = withForm({
  ...goalFormOptions,
  props: {
    collapsed: false,
    startDateId: '',
    unitId: '',
    initialValueId: '',
    toggleId: '',
  },
  render: function Render({
    form,
    collapsed,
    startDateId,
    unitId,
    initialValueId,
    toggleId,
  }) {
    const [isOpen, setIsOpen] = useState(!collapsed);
    const generatedToggleId = useId();
    const resolvedToggleId = toggleId || generatedToggleId;
    const { t } = useLingui();

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {collapsed && (
          <div className="my-2 flex items-center gap-1">
            <CollapsibleTrigger asChild className="mr-2">
              <Button
                size="icon-responsive"
                variant="ghost"
                type="button"
                id={resolvedToggleId}
                className="sm:-ml-2"
              >
                <ChevronRightIcon
                  size={18}
                  className={`transform transition-transform duration-300 ${
                    isOpen ? 'rotate-90' : 'rotate-0'
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <label
              className="flex text-right text-sm font-medium sm:text-xs"
              htmlFor={resolvedToggleId}
            >
              {isOpen ? (
                <Trans>Hide extra options</Trans>
              ) : (
                <Trans>Show extra options</Trans>
              )}
            </label>
          </div>
        )}

        <CollapsibleContent>
          <div className="my-px grid gap-4">
            <form.AppField name="startDate">
              {(field) => (
                <field.DateField
                  id={startDateId || undefined}
                  label={t`Start date`}
                  showPresetDates
                />
              )}
            </form.AppField>
            <form.AppField
              name="unit"
              validators={{
                onChange: ({ value }) =>
                  maxLengthValidator(value, MAX_UNIT_LENGTH, t`Unit`) ||
                  undefined,
              }}
            >
              {(field) => (
                <field.TextField
                  id={unitId || undefined}
                  label={t`Unit`}
                  placeholder={t`e.g. words`}
                  maxLength={MAX_UNIT_LENGTH}
                />
              )}
            </form.AppField>
            <form.AppField name="initialValue">
              {(field) => (
                <field.NumberField
                  id={initialValueId || undefined}
                  label={t`Initial value`}
                  placeholder={t`Numbers only`}
                  min={0}
                  max={MAX_INPUT_NUMBER}
                />
              )}
            </form.AppField>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
});

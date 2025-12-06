import { useEffect, useId, useRef, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { format } from 'date-fns';
import { ChevronRightIcon, SaveIcon, XIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import type { Database } from '~/data/db/AppSchema';
import { cn } from '~/utils';
import CreateGoalForm from './CreateGoalForm';
import { GOAL_FORM_ID } from '../../model';
import { useGoalForm } from '../../hooks/useGoalForm';

interface GoalEditFormProps {
  goal: Database['goal'];
  className?: string;
}
export function GoalEditForm({ goal, className }: GoalEditFormProps) {
  const { updatedAt } = goal;
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const toggleId = useId();
  const contentRef = useRef<HTMLDivElement | null>(null);

  const form = useGoalForm({ mode: 'edit', goal });

  // NOTE: when opening the collapsible, scroll the CreateGoalForm into view (centered)
  useEffect(() => {
    if (isOpen) {
      // Wait for animation to end
      const id = window.setTimeout(() => {
        contentRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 210);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isOpen]);

  return (
    <section className={cn('scroll-mt-24', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex h-[60px] items-start justify-between">
          <div className="flex items-start sm:items-center">
            <CollapsibleTrigger asChild className="mt-0.5 mr-4 sm:mt-0">
              <Button id={toggleId} size="icon-sm" variant="secondary">
                <ChevronRightIcon
                  size={18}
                  className={`transform transition-transform duration-300 ${
                    isOpen ? 'rotate-90' : 'rotate-0'
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <header>
              <label htmlFor={toggleId}>
                <p className="text-foreground text-xl font-semibold">
                  <Trans>Edit goal</Trans>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  <Trans>Last update: {format(updatedAt, 'PPp')}</Trans>
                </p>
              </label>
            </header>
          </div>

          <form.Subscribe
            selector={(state) => [
              state.isSubmitting,
              !state.isDirty || state.isSubmitting,
              !state.isDirty || !state.canSubmit || state.isSubmitting,
            ]}
          >
            {([isSubmitting, isCancelDisabled, isSubmitDisabled]) =>
              isOpen && (
                <div className="animate-fade-in flex gap-2">
                  <div
                    className={cn('flex flex-col items-center gap-1', {
                      'cursor-not-allowed': isCancelDisabled,
                    })}
                  >
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        form.reset();
                      }}
                      aria-label={t`Cancel editing`}
                      disabled={isCancelDisabled}
                    >
                      <XIcon />
                    </Button>
                    <span
                      className={cn('text-xs font-medium', {
                        'text-muted-foreground': isCancelDisabled,
                      })}
                    >
                      <Trans>Cancel</Trans>
                    </span>
                  </div>
                  <div
                    className={cn('flex flex-col items-center gap-1', {
                      'cursor-not-allowed': isSubmitDisabled,
                    })}
                  >
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={t`Save`}
                      form={GOAL_FORM_ID}
                      disabled={isSubmitDisabled || isSubmitting}
                    >
                      <SaveIcon />
                    </Button>
                    <span
                      className={cn('text-xs font-medium', {
                        'text-muted-foreground': isSubmitDisabled,
                      })}
                    >
                      <Trans>Save</Trans>
                    </span>
                  </div>
                </div>
              )
            }
          </form.Subscribe>
        </div>
        <CollapsibleContent>
          <div ref={contentRef}>
            <CreateGoalForm
              form={form}
              formItemClassName="grid-cols-1 items-start gap-y-2 px-1"
              className="py-3"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

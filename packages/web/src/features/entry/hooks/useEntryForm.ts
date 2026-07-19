import { useAppForm } from '~/shared/components/common/form/appForm';

export function useEntryForm(options: {
  date: Date;
  value?: number;
  previousValue?: number;
  onSubmit: (value: { value: number; date: Date }) => Promise<unknown>;
}) {
  const { date, value, previousValue = 0, onSubmit } = options;

  const form = useAppForm({
    defaultValues: {
      date,
      value: value ?? previousValue,
    },
    onSubmit: async ({ value }) => {
      const { value: inputtedValue, date } = value;
      if (inputtedValue === undefined) {
        return;
      }
      try {
        await onSubmit({ value: inputtedValue, date });
      } catch {
        // The mutation owns error reporting. Keep form submission rejections handled.
      }
    },
  });

  return form;
}

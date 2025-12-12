import { createFormHook } from '@tanstack/react-form';

import { ErrorInfo, TextField } from '~/shared/components/common/form/Fields';
import { fieldContext, formContext } from '~/states/formContext';

export const { useAppForm: useAuthAppForm, withForm: withAuthForm } =
  createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
      TextField,
      ErrorInfo,
    },
    formComponents: {},
  });

import { createFormHook } from '@tanstack/react-form';

import { fieldContext, formContext } from '~/states/formContext';
import { FormRoot, SubmitButton } from './FormComponents';
import { FormLayout } from './FormField';
import { DateField, ErrorInfo, NumberField, TextField } from './Fields';

export const appForm = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    NumberField,
    DateField,
    ErrorInfo,
  },
  formComponents: {
    FormRoot,
    FormLayout,
    SubmitButton,
  },
});

export const { useAppForm, withForm, withFieldGroup, extendForm } = appForm;

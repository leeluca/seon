import { useLingui } from '@lingui/react/macro';

import { emailValidator } from '~/utils/validation';
import { withAuthFieldGroup } from './useAuthForm';

interface AuthCredentialFieldProps {
  passwordAutoComplete?: string;
  passwordErrors?: (string | undefined)[];
}

export const AuthCredentialFields = withAuthFieldGroup({
  defaultValues: {
    email: '',
    password: '',
  },
  props: {
    passwordAutoComplete: 'current-password',
    passwordErrors: undefined,
  } as AuthCredentialFieldProps,
  render: function Render({
    group,
    passwordAutoComplete = 'current-password',
    passwordErrors = [],
  }) {
    const { t } = useLingui();

    return (
      <>
        <group.AppField
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return t`Email is required`;
            },
            onBlur: ({ value }) => {
              if (!value.trim()) return undefined;
              return emailValidator(value) || undefined;
            },
          }}
        >
          {(field) => (
            <field.TextField
              label={t`Email`}
              required
              type="email"
              maxLength={100}
              autoComplete="username"
            />
          )}
        </group.AppField>
        <group.AppField
          name="password"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return t`Password is required`;
            },
          }}
        >
          {(field) => (
            <field.TextField
              label={t`Password`}
              required
              type="password"
              maxLength={100}
              autoComplete={passwordAutoComplete}
              additionalErrors={passwordErrors}
            />
          )}
        </group.AppField>
      </>
    );
  },
});

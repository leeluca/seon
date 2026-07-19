export {
  useAppForm as useAuthAppForm,
  withForm as withAuthForm,
  withFieldGroup as withAuthFieldGroup,
} from '~/shared/components/common/form/appForm';

export function validateRequiredAuthFields(values: object) {
  return Object.values(values).some(
    (value) => typeof value === 'string' && !value.trim(),
  )
    ? 'Missing required fields'
    : undefined;
}

import {
  Composite as TComposite,
  Object as TObject,
  String as TString,
} from '@sinclair/typebox';

export const signInSchema = TObject({
  email: TString({ format: 'email' }),
  password: TString(),
});

export const signUpSchema = TComposite([
  signInSchema,
  TObject({ name: TString(), uuid: TString() }),
]);

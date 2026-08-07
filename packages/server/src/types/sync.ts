import {
  Array as TArray,
  Literal as TLiteral,
  Object as TObject,
  Optional as TOptional,
  Record as TRecord,
  String as TString,
  Union as TUnion,
  Unknown as TUnknown,
  type Static,
} from '@sinclair/typebox';

const UUID_PATTERN =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
const recordId = TString({ pattern: UUID_PATTERN });
const operationData = TRecord(TString(), TUnknown());

const putOperation = TObject(
  {
    table: TUnion([TLiteral('goal'), TLiteral('entry'), TLiteral('profile')]),
    op: TLiteral('PUT'),
    id: recordId,
    data: operationData,
  },
  { additionalProperties: false },
);

const patchOperation = TObject(
  {
    table: TUnion([TLiteral('goal'), TLiteral('entry'), TLiteral('profile')]),
    op: TLiteral('PATCH'),
    id: recordId,
    data: operationData,
  },
  { additionalProperties: false },
);

const deleteOperation = TObject(
  {
    table: TUnion([TLiteral('goal'), TLiteral('entry'), TLiteral('profile')]),
    op: TLiteral('DELETE'),
    id: recordId,
    data: TOptional(operationData),
  },
  { additionalProperties: false },
);

export const syncOperationSchema = TUnion([
  putOperation,
  patchOperation,
  deleteOperation,
]);

export const uploadSyncTransactionSchema = TObject(
  {
    // This is the persisted workspace/device ID. It is deliberately not the
    // numeric PowerSync CrudEntry.clientId operation ID.
    clientId: TString({ pattern: UUID_PATTERN }),
    transactionId: TString({ minLength: 1, maxLength: 255 }),
    operations: TArray(syncOperationSchema, { minItems: 1, maxItems: 500 }),
  },
  { additionalProperties: false },
);

export type SyncOperation = Static<typeof syncOperationSchema>;
export type UploadSyncTransaction = Static<typeof uploadSyncTransactionSchema>;

export type SyncRejection = {
  operationIndex: number;
  code: string;
  message: string;
};

export type UploadSyncTransactionResult = {
  result: true;
  transactionId: string;
  status: 'applied' | 'duplicate' | 'rejected';
  rejected: SyncRejection[];
};

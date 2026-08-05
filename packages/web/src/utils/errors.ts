interface APIErrorParams {
  message: string;
  status: number;
  statusText: string;
  code?: string;
}

export class APIError extends Error {
  status: number;
  statusText: string;
  code?: string;

  constructor({ message, status, statusText, code }: APIErrorParams) {
    super(message);
    this.name = 'APIError';
    this.message = message;
    this.status = status;
    this.statusText = statusText;
    this.code = code;
  }
}

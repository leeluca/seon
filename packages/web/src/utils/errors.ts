interface APIErrorParams {
  message: string;
  status: number;
  statusText: string;
}

export class APIError extends Error {
  status: number;
  statusText: string;

  constructor({ message, status, statusText }: APIErrorParams) {
    super(message);
    this.name = 'APIError';
    this.message = message;
    this.status = status;
    this.statusText = statusText;
  }
}

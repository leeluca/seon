export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend request failed with status ${response.status}`);
    }
  }
}

export class CaptureEmailSender implements EmailSender {
  readonly messages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.messages.push(structuredClone(message));
  }

  clear(): void {
    this.messages.length = 0;
  }
}

export class NoopEmailSender implements EmailSender {
  async send(_message: EmailMessage): Promise<void> {}
}

export const capturedEmails = new CaptureEmailSender();

export type EmailDeliveryMode = 'resend' | 'capture' | 'noop';

export interface EmailSenderConfig {
  mode: EmailDeliveryMode;
  resendApiKey?: string;
  from?: string;
}

export function createEmailSender(config: EmailSenderConfig): EmailSender {
  switch (config.mode) {
    case 'resend': {
      if (!config.resendApiKey || !config.from) {
        throw new Error(
          'RESEND_API_KEY and AUTH_EMAIL_FROM are required for resend delivery',
        );
      }
      return new ResendEmailSender(config.resendApiKey, config.from);
    }
    case 'capture':
      return capturedEmails;
    case 'noop':
      return new NoopEmailSender();
  }
}

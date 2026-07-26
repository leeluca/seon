import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CaptureEmailSender,
  createEmailSender,
  NoopEmailSender,
  ResendEmailSender,
} from '../../../src/auth/email.js';

const message = {
  to: 'person@example.com',
  subject: 'Subject',
  text: 'Plain text',
  html: '<p>HTML</p>',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EmailSender', () => {
  it('captures an isolated copy in development and tests', async () => {
    const sender = new CaptureEmailSender();
    await sender.send(message);

    expect(sender.messages).toEqual([message]);
    expect(sender.messages[0]).not.toBe(message);

    sender.clear();
    expect(sender.messages).toEqual([]);
  });

  it('supports explicitly disabled delivery', async () => {
    await expect(new NoopEmailSender().send(message)).resolves.toBeUndefined();
  });

  it('sends through Resend without exposing response bodies', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }));

    await new ResendEmailSender('test-key', 'Seon <auth@example.com>').send(
      message,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      from: 'Seon <auth@example.com>',
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  });

  it('fails fast when Resend configuration is incomplete', () => {
    expect(() => createEmailSender({ mode: 'resend' })).toThrow(
      'RESEND_API_KEY and AUTH_EMAIL_FROM are required',
    );
  });

  it('turns non-success Resend responses into retryable failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('provider details', { status: 503 }),
    );

    await expect(
      new ResendEmailSender('test-key', 'auth@example.com').send(message),
    ).rejects.toThrow('Resend request failed with status 503');
  });
});

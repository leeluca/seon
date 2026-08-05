/**
 * A utility client for making HTTP requests to the test server
 */
export class TestClient {
  private baseUrl: string;
  private cookies: Map<string, string> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  async request(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers);

    if (this.cookies.size > 0) {
      const cookieHeader = Array.from(this.cookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
      headers.set('Cookie', cookieHeader);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    this.processSetCookieHeaders(response);

    return response;
  }

  private processSetCookieHeaders(response: Response) {
    const cookieHeaders = response.headers.getSetCookie();

    for (const cookieStr of cookieHeaders) {
      const [cookiePart] = cookieStr.split(';');
      const separator = cookiePart.indexOf('=');
      const name = cookiePart.slice(0, separator);
      const value = cookiePart.slice(separator + 1);
      if (!name || separator < 0) continue;

      if (value === '' || /Max-Age=0/i.test(cookieStr)) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  async get(path: string, options: RequestInit = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  async post<T = Record<string, unknown>>(
    path: string,
    body: T,
    options: RequestInit = {},
  ) {
    return this.request(path, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(body),
    });
  }

  clearCookies() {
    this.cookies.clear();
  }

  deleteCookie(name: string) {
    this.cookies.delete(name);
  }

  getCookies() {
    return Object.fromEntries(this.cookies.entries());
  }
}

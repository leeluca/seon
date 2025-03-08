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
    const cookieHeaders: string[] = [];

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        cookieHeaders.push(value);
      }
    });

    for (const cookieStr of cookieHeaders) {
      const [cookiePart] = cookieStr.split(';');
      const [name, value] = cookiePart.split('=');
      if (name && value) {
        this.cookies.set(name, value);
      }
    }

    if (cookieHeaders.length === 0) {
      const setCookieHeader = response.headers.get('Set-Cookie');
      if (setCookieHeader) {
        const [cookiePart] = setCookieHeader.split(';');
        const [name, value] = cookiePart.split('=');
        if (name && value) {
          this.cookies.set(name, value);
        }
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

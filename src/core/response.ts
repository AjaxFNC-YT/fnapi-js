export class ApiResponse<T = unknown> {
  public readonly status: number;
  public readonly headers: Record<string, string>;
  public readonly body: T;
  public readonly url: string;
  public readonly method: string;
  public readonly cached: boolean;
  public readonly receivedAt: Date;

  constructor(init: {
    status: number;
    headers: Record<string, string>;
    body: T;
    url: string;
    method: string;
    cached?: boolean;
  }) {
    this.status = init.status;
    this.headers = init.headers;
    this.body = init.body;
    this.url = init.url;
    this.method = init.method;
    this.cached = init.cached ?? false;
    this.receivedAt = new Date();
  }

  get ok(): boolean {
    return this.status >= 200 && this.status < 300;
  }

  get failed(): boolean {
    return !this.ok;
  }

  header(name: string): string | undefined {
    return this.headers[name.toLowerCase()];
  }

  toJSON(): {
    status: number;
    headers: Record<string, string>;
    body: T;
    url: string;
    method: string;
    cached: boolean;
  } {
    return {
      status: this.status,
      headers: this.headers,
      body: this.body,
      url: this.url,
      method: this.method,
      cached: this.cached,
    };
  }
}

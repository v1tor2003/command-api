import type { HttpQueryParams, HttpRequestContext } from '@/types/http';

/**
 * Encapsulates URL resolution and query parameter serialization for HTTP requests.
 *
 * Adheres to the Single Responsibility Principle (SRP) by isolating URL formatting,
 * relative-to-base path resolution, and parameter normalization away from the transport execution engine.
 *
 * @example
 * ```typescript
 * const builder = new HttpUrlBuilder('https://api.example.com/v1');
 * const url = builder.build('/users', { page: 1, tags: ['admin', 'active'] });
 * // Result: "https://api.example.com/v1/users?page=1&tags=admin&tags=active"
 * ```
 */
export class HttpUrlBuilder {
  private readonly normalizedBaseUrl: string;

  /**
   * Initializes a new instance of {@link HttpUrlBuilder}.
   *
   * @param baseUrl - Optional base URL to prepend to relative paths (e.g. `'https://api.example.com'`).
   */
  constructor(baseUrl = '') {
    this.normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Constructs the target URL string by combining the base URL, target path, and optional query parameters.
   *
   * @param path - Relative or absolute endpoint path.
   * @param query - Key-value dictionary of query parameters.
   * @returns Fully-qualified URL or relative path with query parameters attached.
   */
  public build(path: string, query?: HttpRequestContext['query']): string {
    const isAbsolute = /^https?:\/\//i.test(path);
    const fullUrl = this.resolveBaseAndPath(path, isAbsolute);

    if (!query || Object.keys(query).length === 0) return fullUrl;

    const urlObj = new URL(fullUrl, isAbsolute ? undefined : 'http://localhost');
    this.appendQueryParameters(urlObj, query);

    return isAbsolute || this.normalizedBaseUrl
      ? urlObj.toString()
      : `${urlObj.pathname}${urlObj.search}`;
  }

  /**
   * Resolves the combination of the base URL and endpoint path.
   *
   * @param path - Endpoint path.
   * @param isAbsolute - Whether the path is already an absolute HTTP(S) URL.
   * @returns Combined URL path string.
   */
  private resolveBaseAndPath(path: string, isAbsolute: boolean): string {
    if (isAbsolute) return path;

    const normalizedPath = path.replace(/^\/+/, '');
    return this.normalizedBaseUrl ? `${this.normalizedBaseUrl}/${normalizedPath}` : path;
  }

  /**
   * Appends query parameters to the URL instance, safely ignoring nullish entries.
   *
   * @param url - The URL object to append parameters to.
   * @param query - The query parameters map.
   */
  private appendQueryParameters(url: URL, query: HttpQueryParams): void {
    for (const [key, val] of Object.entries(query)) {
      if (val === undefined || val === null) continue;

      if (Array.isArray(val)) {
        this.appendArrayQueryParam(url, key, val);
      } else {
        url.searchParams.append(key, String(val));
      }
    }
  }

  /**
   * Appends an array of values under a single query parameter key.
   *
   * @param url - The URL object to modify.
   * @param key - The query parameter key.
   * @param values - The array of values to append.
   */
  private appendArrayQueryParam(url: URL, key: string, values: unknown[]): void {
    for (const item of values) {
      if (item !== undefined && item !== null) {
        url.searchParams.append(key, String(item));
      }
    }
  }
}

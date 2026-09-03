import { HttpError } from '@/types/http';

const HTTP_STATUS_NO_CONTENT = 204;
const HTTP_STATUS_RESET_CONTENT = 205;
const MIME_TYPE_JSON = 'application/json';

/**
 * Handles HTTP response validation, status code branching, and payload deserialization.
 *
 * Implements the Single Responsibility Principle (SRP) by isolating the logic for translating
 * fetch `Response` objects into typed data or throwing structured {@link HttpError} instances.
 *
 * @example
 * ```typescript
 * const handler = new HttpResponseHandler();
 * const data = await handler.handle<User>(response);
 * ```
 */
export class HttpResponseHandler {
  /**
   * Processes a fetch `Response`, returning typed output or throwing an {@link HttpError}.
   *
   * @typeParam T - Expected return data type.
   * @param response - The raw `Response` object returned from fetch.
   * @returns A promise resolving to the deserialized response body, or `undefined` for 204/205 responses.
   * @throws {@link HttpError} if `response.ok` is `false`.
   */
  public async handle<T = unknown>(response: Response): Promise<T> {
    if (!response.ok) await this.throwHttpError(response);
    if (this.isNoContent(response.status)) return undefined as T;

    return (await this.parseBody(response)) as T;
  }

  /**
   * Determines whether an HTTP status code signifies an empty body.
   *
   * @param status - The HTTP status code number.
   * @returns `true` if the status is 204 or 205, otherwise `false`.
   */
  public isNoContent(status: number): boolean {
    return status === HTTP_STATUS_NO_CONTENT || status === HTTP_STATUS_RESET_CONTENT;
  }

  /**
   * Extracts response payload as parsed JSON or plain text.
   *
   * @param response - The `Response` object to decode.
   * @returns Parsed JSON object, plain string, or `undefined` if empty.
   */
  public async parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();
    if (!text) return undefined;

    if (this.isJsonPayload(contentType, text)) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }

    return text;
  }

  /**
   * Extracts headers from a `Response` into a plain key-value map.
   *
   * @param response - The `Response` object to extract headers from.
   * @returns Plain object with lowercase header keys.
   */
  public extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      headers[key] = val;
    });
    return headers;
  }

  /**
   * Constructs and throws a standardized {@link HttpError} from an unsuccessful response.
   *
   * @param response - Unsuccessful fetch `Response` (`response.ok === false`).
   * @throws {@link HttpError}
   */
  private async throwHttpError(response: Response): Promise<never> {
    const errorData = await this.parseBody(response);
    const headers = this.extractHeaders(response);
    throw new HttpError(response.status, response.statusText, errorData, headers);
  }

  /**
   * Checks whether the response content represents JSON data based on MIME type or string format.
   *
   * @param contentType - Value of the `Content-Type` header.
   * @param text - The raw text payload.
   * @returns `true` if the content is JSON, otherwise `false`.
   */
  private isJsonPayload(contentType: string, text: string): boolean {
    return contentType.includes(MIME_TYPE_JSON) || text.startsWith('{') || text.startsWith('[');
  }
}

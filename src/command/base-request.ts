import type { HttpRequestContext } from '@/types/http';

/**
 * Generic abstract class defining the Command Contract in the Command Pattern (In -> Out).
 *
 * Each concrete command encapsulates its input parameters, translates them to an HTTP request context,
 * and binds a strictly typed return value.
 *
 * @typeParam TInput - The input type required to construct the command (defaults to `void`).
 * @typeParam TOutput - The expected output return type inferred when dispatched via `ApiClient.send()` (defaults to `unknown`).
 *
 * @example
 * ```typescript
 * interface CreateUserInput { name: string; email: string; }
 * interface UserResponse { id: string; name: string; }
 *
 * class CreateUserCommand extends BaseRequest<CreateUserInput, UserResponse> {
 *   toHttp(): HttpRequestContext {
 *     return {
 *       method: 'POST',
 *       path: '/users',
 *       body: this.input,
 *     };
 *   }
 *
 *   transformResponse(raw: unknown): UserResponse {
 *     return raw as UserResponse;
 *   }
 * }
 * ```
 */
export abstract class BaseRequest<TInput = void, TOutput = unknown> {
  /**
   * Phantom property ensuring static TypeScript return type inference on `api.send()`.
   * Never exists at runtime.
   */
  declare readonly _outputType: TOutput;

  /**
   * Constructs an instance of the command with its strongly-typed input parameters.
   *
   * @param input - Input parameters carrying the command's request state.
   */
  constructor(protected readonly input: TInput) {}

  /**
   * Translates the command's input state into an outgoing HTTP request specification.
   *
   * @returns The {@link HttpRequestContext} specifying the HTTP method, path, headers, query, and body.
   */
  abstract toHttp(): HttpRequestContext;

  /**
   * Optional lifecycle hook executed after receiving the raw transport response.
   *
   * Allows validating, sanitizing, or parsing data using libraries such as Zod, ArkType, or Valibot
   * before returning the final typed output to the caller.
   *
   * @param raw - The raw, deserialized response from the transport layer.
   * @returns The parsed and typed `TOutput`.
   */
  transformResponse?(raw: unknown): TOutput;

  /**
   * Returns the command's identifier name used in observability logs.
   * Defaults to the class constructor name.
   */
  get commandName(): string {
    return this.constructor.name;
  }
}

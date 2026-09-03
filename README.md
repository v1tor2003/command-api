# @v1tor2003/command-api

A lightweight, zero-dependency, transport-agnostic TypeScript client library that implements the Command Pattern (In/Out) for HTTP/REST APIs.

## 1. Core Concept & Value Proposition

- **Command Pattern (In -> Out)**: Every API endpoint is an encapsulated class/command carrying its input parameters, HTTP translation rules, and strictly bound TypeScript return type.
- **Decoupled Architecture**: Business logic never binds directly to `fetch`, `axios`, or any HTTP client.
- **Go/Rust-Style Results**: Dispatch calls resolve to `{ data, error }` discriminated unions instead of throwing unhandled promise rejections.
- **Zero Runtime Dependencies**: Core client relies strictly on standard TypeScript/Web primitives.

## 2. Key Architecture Components

### A. The Command Contract (`BaseRequest<TInput, TOutput>`)

- Generic abstract class defining strictly typed input: `TInput`.
- `toHttp(): HttpRequestContext` turns input parameters into method, path, query, headers, and body.
- `transformResponse?(raw: unknown): TOutput` provides an optional hook for validation/parsing (e.g., Zod, ArkType, Valibot).
- Phantom property `declare readonly _outputType: TOutput` guarantees type inference on `.send()`.

### B. Transport Layer (`ITransport`)

- Single-method interface: `send<T>(ctx: HttpRequestContext): Promise<T>`.
- Pluggable execution engine allowing users to swap runtime transports without altering command code:
  - Native `fetch` (default, zero deps).
  - `axios`, `ky`, `got`, or mock/testing transports.

### C. Middleware / Interceptor Pipeline

- Onion-style execution chain: `(context, next, command) => Promise<TOutput>`.
- Supports bi-directional request/response interception:
  - Auth token injection (e.g., Bearer headers).
  - Automatic retry with exponential backoff.
  - Distributed tracing / correlation IDs (`X-Correlation-ID`).

### D. Observability & Logging Engine

- Dynamic toggle: Enable or disable logging on initialization or at runtime via `client.setLogging(boolean)`.
- Structured `LogEntry`: Captures command name, method, path, duration in milliseconds, payload, and errors.
- Custom Formatter Support: Exposes `LogFormatter` allowing users to format logs (e.g., raw JSON, single-line text, Pino/Datadog forwarders) via `client.setLogFormatter(fn)`.

## 3. Developer Experience (DX) Reference

```typescript
// 1. Define Request Command
interface CreateUserInput {
  name: string;
  email: string;
}
interface UserResponse {
  id: string;
  name: string;
  createdAt: string;
}

class CreateUserCommand extends BaseRequest<CreateUserInput, UserResponse> {
  toHttp(): HttpRequestContext {
    return {
      method: 'POST',
      path: '/users',
      body: this.input,
    };
  }
}

// 2. Setup Client
const api = new ApiClient({
  transport: new FetchTransport('https://api.example.com'),
  logging: { enabled: true },
  middleware: [authMiddleware, retryMiddleware(2)],
});

// 3. Dispatch
const { data, error } = await api.send(
  new CreateUserCommand({ name: 'Alice', email: 'alice@example.com' }),
);

if (error) {
  // error is typed as Error
  console.error(error.message);
  return;
}

// data is strictly inferred as UserResponse
console.log(data.id);
```

## 4. Packaging & Distribution Plan

- **Dual ESM/CJS Output**: Build with `tsup` targeting both `import` and `require`.
- **Sub-path Exports**:
  - Package root: `@v1tor2003/command-api` (Core client, commands, interfaces).
  - Subpaths: `@v1tor2003/command-api/fetch`, `@v1tor2003/command-api/axios` (Optional pre-bundled adapters).
- **Bundle Budget**: Core bundle size target < 2 KB minified + gzipped.

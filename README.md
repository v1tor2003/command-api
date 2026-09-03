# @v1tor2003/command-api

<p align="left">
  <a href="https://www.npmjs.com/package/@v1tor2003/command-api"><img src="https://img.shields.io/npm/v/@v1tor2003/command-api.svg?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://github.com/v1tor2003/command-api/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/v1tor2003/command-api/ci.yml?branch=main&style=flat-square" alt="CI Status" /></a>
  <a href="https://github.com/v1tor2003/command-api/blob/main/LICENSE"><img src="https://img.shields.io/github/license/v1tor2003/command-api.svg?style=flat-square" alt="License" /></a>
  <a href="https://www.npmjs.com/package/@v1tor2003/command-api"><img src="https://img.shields.io/badge/dependencies-0-brightgreen.svg?style=flat-square" alt="Zero Dependencies" /></a>
  <a href="https://www.npmjs.com/package/@v1tor2003/command-api"><img src="https://img.shields.io/badge/provenance-sigstore-informational.svg?style=flat-square" alt="Provenance" /></a>
  <a href="https://www.npmjs.com/package/@v1tor2003/command-api"><img src="https://img.shields.io/badge/types-TypeScript%205+-blue.svg?style=flat-square" alt="TypeScript" /></a>
</p>

A lightweight, zero-dependency, transport-agnostic TypeScript client library implementing the **Command Pattern (In &rarr; Out)** for HTTP/REST APIs.

---

## Highlights

- **Command Pattern (In &rarr; Out)**: Encapsulate input parameters, URL serialization, and output typings into isolated, testable command units.
- **Go/Rust-Style Results (`Result<T, E>`)**: End unhandled promise rejections. Dispatch returns `{ data, error }` discriminated unions that force clean, branch-safe error handling.
- **Zero-Dependency & Transport Agnostic**: Ships with a high-performance, native Web Fetch transport. Easily plug in Axios, Ky, Got, or in-memory mocks without rewriting business logic.
- **Onion Middleware Pipeline**: Bi-directional request/response interceptors supporting authentication injection, automatic retries with backoff, and tracing headers.
- **Built-in Observability**: Microsecond-precision timing metrics, runtime log level toggles, and extensible log formatters (ready for Pino, Winston, or Datadog).
- **Modern Standards**: Strict dual ESM/CJS distribution, full TypeScript declarations, and 100% verified TSDoc with API Extractor.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [1. Creating Commands (`BaseRequest`)](#1-creating-commands-baserequest)
  - [2. Dispatching with `ApiClient`](#2-dispatching-with-apiclient)
  - [3. Error Handling (`Result<T, E>`)](#3-error-handling-resultt-e)
  - [4. Middleware Pipeline](#4-middleware-pipeline)
  - [5. Pluggable Transports](#5-pluggable-transports)
  - [6. Observability & Logging](#6-observability--logging)
- [Testing & Mocking](#testing--mocking)
- [API Reference](#api-reference)
- [License](#license)

---

## Installation

```bash
# npm
npm install @v1tor2003/command-api

# pnpm
pnpm add @v1tor2003/command-api

# yarn
yarn add @v1tor2003/command-api

# bun
bun add @v1tor2003/command-api
```

---

## Quick Start

### 1. Define a Command

Commands encapsulate input parameters, translate them into HTTP semantics, and strictly bind the return type:

```typescript
import { BaseRequest, type HttpRequestContext } from '@v1tor2003/command-api';

interface GetUserInput {
  userId: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
}

export class GetUserCommand extends BaseRequest<GetUserInput, UserResponse> {
  toHttp(): HttpRequestContext {
    return {
      method: 'GET',
      path: `/users/${this.input.userId}`,
    };
  }
}
```

### 2. Initialize the Client and Dispatch

```typescript
import { ApiClient, FetchTransport } from '@v1tor2003/command-api';
import { GetUserCommand } from './commands/get-user.command';

// Initialize with a base URL and transport
const api = new ApiClient({
  transport: new FetchTransport('https://api.example.com'),
  logging: true,
});

// Dispatch the command
const { data, error } = await api.send(new GetUserCommand({ userId: 'usr_123' }));

if (error) {
  console.error('Operation failed:', error.message);
  return;
}

// data is strictly inferred as UserResponse
console.log('User found:', data.name, data.email);
```

---

## Core Concepts

### 1. Creating Commands (`BaseRequest`)

Every API endpoint is modeled as a discrete command inheriting from `BaseRequest<TInput, TOutput>`.

```typescript
import { BaseRequest, type HttpRequestContext } from '@v1tor2003/command-api';

export interface CreateUserInput {
  name: string;
  email: string;
  role?: 'admin' | 'user';
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export class CreateUserCommand extends BaseRequest<CreateUserInput, UserDTO> {
  toHttp(): HttpRequestContext {
    return {
      method: 'POST',
      path: '/users',
      body: this.input,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Optional lifecycle hook to parse, validate, or transform raw response payloads.
   * Ideal for schema validation libraries (Zod, ArkType, Valibot).
   */
  transformResponse(raw: unknown): UserDTO {
    const data = raw as Record<string, unknown>;
    return {
      id: String(data.id),
      name: String(data.name).trim(),
      email: String(data.email).toLowerCase(),
      createdAt: String(data.createdAt),
    };
  }
}
```

### 2. Dispatching with `ApiClient`

`ApiClient` orchestrates the request lifecycle, executing middlewares, delegating to the transport layer, and normalizing exceptions into structured results.

```typescript
import { ApiClient, FetchTransport } from '@v1tor2003/command-api';

const api = new ApiClient({
  transport: new FetchTransport({
    baseUrl: 'https://api.example.com/v1',
    headers: {
      'User-Agent': 'MyApp/1.0.0',
    },
  }),
  logging: true,
});
```

### 3. Error Handling (`Result<T, E>`)

`ApiClient.send()` never throws unhandled promise rejections for HTTP failures or network crashes. Instead, it returns a **`Result<T, E>`** discriminated union:

```typescript
const result = await api.send(new CreateUserCommand(payload));

// Discriminated union check
if (result.error) {
  // result.error is typed as Error (or HttpError)
  console.error(`Error: ${result.error.message}`);
  return;
}

// TypeScript automatically narrows result.data to UserDTO
console.log(`Created user with ID: ${result.data.id}`);
```

You can also use the built-in functional guards:

```typescript
import { isOk, isErr } from '@v1tor2003/command-api';

if (isErr(result)) {
  console.error(result.error.message);
} else if (isOk(result)) {
  console.log(result.data.name);
}
```

### 4. Middleware Pipeline

Middlewares run in an **onion-style execution model** (similar to Koa or Express). Middlewares can inspect and mutate the request context before execution, and capture or modify responses upon return.

#### Authentication Middleware

```typescript
import type { Middleware } from '@v1tor2003/command-api';

export const authMiddleware: Middleware = async (ctx, next, command) => {
  const token = await getAuthToken();
  ctx.headers = {
    ...ctx.headers,
    Authorization: `Bearer ${token}`,
  };

  return next();
};
```

#### Automatic Retry Middleware

Because `next()` can be invoked downstream multiple times, implementing retry loops with exponential backoff is straightforward:

```typescript
import type { Middleware } from '@v1tor2003/command-api';

export const retryMiddleware = (maxRetries = 2): Middleware => {
  return async (ctx, next) => {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        return await next();
      } catch (err) {
        attempts += 1;
        if (attempts >= maxRetries) throw err;
        await new Promise((res) => setTimeout(res, 1000 * attempts));
      }
    }
  };
};

// Register via fluent chaining
api.use(authMiddleware).use(retryMiddleware(3));
```

### 5. Pluggable Transports

Business logic depends solely on the `ITransport` abstraction, not on a concrete networking library:

```typescript
export interface ITransport {
  send<T = unknown>(ctx: HttpRequestContext): Promise<T>;
}
```

#### Built-in `FetchTransport`

`FetchTransport` uses native `fetch` with automatic JSON serialization, binary body detection (`FormData`, `Blob`, `ArrayBuffer`), empty status code handling (`204 No Content`, `205 Reset Content`), and query string building.

```typescript
const transport = new FetchTransport({
  baseUrl: 'https://api.example.com',
  fetch: customFetchImplementation, // Optional custom fetch override
});
```

#### Custom Adapter (e.g., Axios)

To use another HTTP engine, simply implement `ITransport`:

```typescript
import axios from 'axios';
import type { ITransport, HttpRequestContext } from '@v1tor2003/command-api';

export class AxiosTransport implements ITransport {
  constructor(private readonly baseUrl: string) {}

  async send<T = unknown>(ctx: HttpRequestContext): Promise<T> {
    const response = await axios.request<T>({
      baseURL: this.baseUrl,
      url: ctx.path,
      method: ctx.method,
      params: ctx.query,
      headers: ctx.headers,
      data: ctx.body,
      signal: ctx.signal,
    });

    return response.data;
  }
}
```

### 6. Observability & Logging

`command-api` includes structured performance timing and telemetry hooks:

```typescript
const api = new ApiClient({
  transport: new FetchTransport('https://api.example.com'),
  logging: {
    enabled: true,
    // Custom log formatting (e.g. forward to Datadog or Pino)
    formatter: (entry) => {
      logger.info({
        command: entry.command,
        method: entry.method,
        path: entry.path,
        durationMs: entry.durationMs,
        status: entry.error ? 'FAILED' : 'SUCCESS',
      });
      return undefined; // Handled externally
    },
  },
});

// Dynamically adjust logging at runtime
api.setLogging(false);
```

Default log format:

```text
[GetUserCommand] GET /users/123 - 18.40ms (SUCCESS)
[CreateUserCommand] POST /users - 34.12ms (ERROR: Bad Request)
```

---

## Testing & Mocking

Because commands are pure declarative classes, unit testing is fast and avoids fragile HTTP server mocking:

```typescript
import { describe, expect, it } from 'vitest';
import { GetUserCommand } from './get-user.command';

describe('GetUserCommand', () => {
  it('translates input parameters to HTTP context', () => {
    const command = new GetUserCommand({ userId: '42' });

    expect(command.commandName).toBe('GetUserCommand');
    expect(command.toHttp()).toEqual({
      method: 'GET',
      path: '/users/42',
    });
  });

  it('transforms raw response', () => {
    const command = new GetUserCommand({ userId: '42' });
    const transformed = command.transformResponse?.({
      id: 42,
      name: '  Alice  ',
      email: 'ALICE@EXAMPLE.COM',
    });

    expect(transformed).toEqual({
      id: '42',
      name: 'Alice',
      email: 'alice@example.com',
    });
  });
});
```

---

## API Reference

| Export                           | Type           | Description                                                                       |
| :------------------------------- | :------------- | :-------------------------------------------------------------------------------- |
| `ApiClient`                      | Class          | Core client dispatcher executing commands via middlewares and transport.          |
| `BaseRequest<TIn, TOut>`         | Abstract Class | Base command class binding input parameters, HTTP translation, and output types.  |
| `FetchTransport`                 | Class          | Default zero-dependency transport using the Web Fetch API.                        |
| `HttpUrlBuilder`                 | Class          | Encapsulates path resolution and query parameter serialization.                   |
| `HttpPayloadResolver`            | Class          | Encapsulates request header merging and body evaluation.                          |
| `HttpResponseHandler`            | Class          | Evaluates response status, 204/205 empty states, and JSON decoding.               |
| `MiddlewarePipeline`             | Class          | Encapsulates onion-style middleware registration and execution.                   |
| `HttpError`                      | Class          | Standardized HTTP error containing `status`, `statusText`, `data`, and `headers`. |
| `LoggerService`                  | Class          | Handles execution timing, formatting, and console telemetry.                      |
| `ok(data)`                       | Function       | Factory creating a successful `Result` (`{ data, error: null }`).                 |
| `err(error)`                     | Function       | Factory creating an error `Result` (`{ data: null, error }`).                     |
| `isOk(result)` / `isErr(result)` | Functions      | TypeScript type-guard assertions for `Result` unions.                             |

---

## License

[MIT](LICENSE) © [Vítor Pires](https://github.com/v1tor2003)

import { BaseRequest } from '@/command/base-request';
import type { HttpRequestContext } from '@/types/http';
import { describe, expect, it } from 'vitest';

interface CreateUserInput {
  name: string;
  email: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
}

class CreateUserCommand extends BaseRequest<CreateUserInput, UserResponse> {
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

  transformResponse(raw: unknown): UserResponse {
    const data = raw as Record<string, unknown>;
    return {
      id: String(data.id),
      name: String(data.name).trim(),
      email: String(data.email).toLowerCase(),
    };
  }
}

class SimpleGetCommand extends BaseRequest<void, string> {
  toHttp(): HttpRequestContext {
    return {
      method: 'GET',
      path: '/status',
    };
  }
}

describe('BaseRequest Contract', () => {
  it('encapsulates input parameters and translates to HttpRequestContext', () => {
    const cmd = new CreateUserCommand({ name: 'Alice', email: 'Alice@Example.com' });

    expect(cmd.commandName).toBe('CreateUserCommand');
    expect(cmd.toHttp()).toEqual({
      method: 'POST',
      path: '/users',
      body: { name: 'Alice', email: 'Alice@Example.com' },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('supports transformResponse hook for data transformation/validation', () => {
    const cmd = new CreateUserCommand({ name: 'Alice', email: 'Alice@Example.com' });
    const transformed = cmd.transformResponse?.({
      id: 101,
      name: '  Alice  ',
      email: 'ALICE@EXAMPLE.COM',
    });

    expect(transformed).toEqual({
      id: '101',
      name: 'Alice',
      email: 'alice@example.com',
    });
  });

  it('handles commands with void input', () => {
    const cmd = new SimpleGetCommand();
    expect(cmd.commandName).toBe('SimpleGetCommand');
    expect(cmd.toHttp()).toEqual({
      method: 'GET',
      path: '/status',
    });
  });
});

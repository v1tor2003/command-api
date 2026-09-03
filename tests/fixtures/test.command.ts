import { BaseRequest, type HttpRequestContext } from '@/index';

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UserResponse {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateUserProfileInput {
  bio: string;
  avatar: string;
}

export interface UserProfileResponse {
  id: string;
  userId: string;
  bio: string;
  avatar: string;
}

export class CreateUserCommand extends BaseRequest<CreateUserInput, UserResponse> {
  toHttp(): HttpRequestContext {
    return {
      method: 'POST',
      path: '/users',
      body: this.input,
    };
  }
}

export class MockCommand extends BaseRequest<{ query: string }, { result: string }> {
  toHttp(): HttpRequestContext {
    return {
      method: 'GET',
      path: '/search',
      headers: {},
    };
  }
}

export class SimpleGetCommand extends BaseRequest<void, string> {
  toHttp(): HttpRequestContext {
    return {
      method: 'GET',
      path: '/status',
    };
  }
}

export class CreateUserProfileCommand extends BaseRequest<
  CreateUserProfileInput,
  UserProfileResponse
> {
  toHttp(): HttpRequestContext {
    return {
      method: 'POST',
      path: '/users/{userId}/profile',
      body: this.input,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  transformResponse(raw: unknown): UserProfileResponse {
    const data = raw as Record<string, unknown>;
    return {
      id: String(data.id),
      userId: String(data.userId),
      bio: String(data.bio).trim(),
      avatar: String(data.avatar).toLowerCase(),
    };
  }
}

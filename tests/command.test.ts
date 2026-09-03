import { describe, expect, it } from 'vitest';
import { CreateUserProfileCommand, SimpleGetCommand } from './fixtures/test.command';

describe('BaseRequest Contract', () => {
  it('encapsulates input parameters and translates to HttpRequestContext', () => {
    const cmd = new CreateUserProfileCommand({ bio: 'Software Engineer', avatar: 'avatar.jpg' });

    expect(cmd.commandName).toBe('CreateUserProfileCommand');
    expect(cmd.toHttp()).toEqual({
      method: 'POST',
      path: '/users/{userId}/profile',
      body: { bio: 'Software Engineer', avatar: 'avatar.jpg' },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('supports transformResponse hook for data transformation/validation', () => {
    const cmd = new CreateUserProfileCommand({ bio: 'Software Engineer', avatar: 'avatar.jpg' });
    const transformed = cmd.transformResponse?.({
      id: 101,
      userId: 'user123',
      bio: '  Software Engineer  ',
      avatar: 'AVATAR.JPG',
    });

    expect(transformed).toEqual({
      id: '101',
      userId: 'user123',
      bio: 'Software Engineer',
      avatar: 'avatar.jpg',
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

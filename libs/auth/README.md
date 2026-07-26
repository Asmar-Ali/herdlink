# `@herdlink/auth`

Shared stateless JWT authentication for HerdLink NestJS services. The library
owns token issuance, bearer-token verification, request principal mapping, and
the default-deny route guard.

## Feature contract

- Every route is protected after `AuthModule` is registered.
- A route or controller is public only when decorated with `@Public()`.
- Protected requests use `Authorization: Bearer <token>`.
- Missing, malformed, expired, incorrectly signed, or wrong-issuer tokens are
  rejected with `401 Unauthorized`.
- Successful authentication sets `request.user` to an `AuthenticatedUser`.
- The library authenticates principals; it does not enforce roles or other
  authorization policy.

The current implementation is HTTP-only. `@CurrentUser()` reads from the HTTP
request and is not a WebSocket or Kafka principal abstraction.

## Token model

All tokens are JWTs signed with symmetric `HS256`. The default issuer is
`herdlink`.

```ts
interface JwtPayload {
  sub: string;
  type: 'user' | 'service';
  roles?: string[];
  iss?: string;
  iat?: number;
  exp?: number;
}
```

### User tokens

Created with `TokenService.signUser(subject, roles?)`.

- `sub`: caller-supplied user identifier
- `type`: `user`
- `roles`: caller-supplied roles, default `[]`
- Default TTL: 1 hour

### Service tokens

Created with `TokenService.signService(serviceName)`.

- `sub`: `service:<serviceName>`
- `type`: `service`
- No roles claim
- Default TTL: 365 days

The long service-token TTL is a development/portfolio trade-off, not a
production credential-rotation design.

## Request flow

1. Nest runs `JwtAuthGuard` globally through `APP_GUARD`.
2. The guard checks handler and controller metadata for `@Public()`.
3. Public routes bypass Passport.
4. Protected routes extract the bearer token from the `Authorization` header.
5. `JwtStrategy` verifies the `HS256` signature, configured issuer, and standard
   JWT time claims.
6. The verified payload is mapped to:

```ts
interface AuthenticatedUser {
  id: string;
  type: 'user' | 'service';
  roles: string[];
}
```

`id` comes from `sub`; a missing `roles` claim becomes `[]`.

## Configuration

### Recommended: dependency-injected configuration

Register the module after the service's global `ConfigModule`:

```ts
AuthModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>('JWT_SECRET'),
  }),
});
```

This keeps environment access inside Nest configuration and fails service
startup when the secret is absent.

### Static configuration

For tests or isolated applications:

```ts
AuthModule.forRoot({
  secret: 'test-only-secret',
  issuer: 'herdlink',
  userTokenTtlSeconds: 3600,
  serviceTokenTtlSeconds: 86400,
});
```

### Options

| Option | Required | Default | Meaning |
|---|---:|---:|---|
| `secret` | yes | — | Shared HS256 signing and verification secret |
| `issuer` | no | `herdlink` | Required issuer for verified tokens |
| `userTokenTtlSeconds` | no | `3600` | User-token lifetime |
| `serviceTokenTtlSeconds` | no | `31536000` | Service-token lifetime |

`validateAuthEnv(config)` is exported for services that want a standalone
non-empty `JWT_SECRET` validator. It does not enforce secret strength.

## Route usage

Because protection is global, protected handlers need no auth decorator:

```ts
@Post()
create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDto) {
  return this.service.create(dto, user);
}
```

Public handlers must opt out explicitly:

```ts
@Public()
@Get()
findAll() {
  return this.service.findAll();
}
```

`@Public()` can decorate either one handler or an entire controller. Method
metadata takes precedence over controller metadata.

## Exported API

- `AuthModule`, `AuthModuleOptions`, `AuthModuleAsyncOptions`
- `TokenService`
- `JwtAuthGuard`
- `Public`, `IS_PUBLIC_KEY`
- `CurrentUser`
- `JwtPayload`, `AuthenticatedUser`, `Principal`
- `AUTH_OPTIONS`
- `validateAuthEnv`
- Default issuer and TTL constants

`JwtStrategy` is intentionally internal.

## Security boundaries and non-goals

- Shared-secret compromise lets an attacker mint both user and service tokens.
- There is no refresh-token flow, revocation list, audience validation, key
  rotation, OAuth2/OIDC integration, or role guard.
- `TokenService` always emits `iat` and `exp`. Verification checks `exp` when it
  exists but does not currently require every externally minted token to carry
  an `exp` claim.
- Payload shape is represented in TypeScript but is not runtime-schema
  validated after signature verification.
- Never log `JWT_SECRET`, bearer tokens, or complete decoded payloads.

For production beyond the current project scope, prefer asymmetric signing,
short-lived service credentials, audience checks, key rotation, and an
external identity provider.

## Build and test

From `libs/auth`:

```sh
npm run build
npm test -- --runInBand
npm pack --dry-run
```

Tests cover token claims, wrong-secret rejection, public/protected route
behavior, current-user mapping, and synchronous/asynchronous module
configuration.

## Related documentation

- [`docs/TECH_STACK.md`](../../docs/TECH_STACK.md) — decision and trade-offs
- [`apps/device-service/docs/ENDPOINTS.md`](../../apps/device-service/docs/ENDPOINTS.md)
  — current consumer route policy
- [`docs/PRD.md`](../../docs/PRD.md) — product-level security scope

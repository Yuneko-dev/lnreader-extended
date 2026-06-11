import { Buffer } from 'react-native-quick-crypto';

import { DEFAULT_SUPER_PROPERTIES, DEFAULTS } from './utils/Constants';

const noop = () => {};

const methods = ['get', 'post', 'delete', 'patch', 'put'] as const;

const reflectors = [
  'toString',
  'valueOf',
  'inspect',
  'constructor',
  Symbol.toPrimitive,
  Symbol.for('nodejs.util.inspect.custom'),
] as const;

type HttpMethod = (typeof methods)[number];

type RouteProxy = {
  [key: string]: RouteProxy;
  (...args: Array<string | number | null | undefined>): RouteProxy;
} & {
  [K in HttpMethod]: (options?: RequestInit) => Promise<Response>;
};

export class API {
  constructor(public readonly baseURL: string = DEFAULTS.API_SDK_BASE) {}
  get api(): RouteProxy {
    return buildRoute(this);
  }
}

function buildRoute(manager: API): RouteProxy {
  const route: string[] = [''];

  const handler: ProxyHandler<typeof noop> = {
    get(_target, name) {
      if (reflectors.includes(name as never)) {
        return () => route.join('/');
      }

      if (typeof name === 'string' && methods.includes(name as HttpMethod)) {
        return (options?: RequestInit) => {
          options = options ?? {};
          if (options.headers instanceof Headers) {
            // Add User-Agent & X-Super-Properties:
            options.headers.set('User-Agent', DEFAULTS.USER_AGENT);
            options.headers.set(
              'X-Super-Properties',
              Buffer.from(
                JSON.stringify(DEFAULT_SUPER_PROPERTIES),
                'ascii',
              ).toString('base64'),
            );
          } else {
            options.headers = {
              ...options.headers,
              'User-Agent': DEFAULTS.USER_AGENT,
              'X-Super-Properties': Buffer.from(
                JSON.stringify(DEFAULT_SUPER_PROPERTIES),
                'ascii',
              ).toString('base64'),
            };
          }
          return fetch(manager.baseURL + route.join('/'), {
            method: name.toUpperCase(),
            ...options,
          });
        };
      }

      route.push(String(name));
      return new Proxy(noop, handler);
    },

    apply(_target, _thisArg, args: unknown[]) {
      route.push(
        ...args.filter((x): x is string | number => x != null).map(String),
      );

      return new Proxy(noop, handler);
    },
  };

  return new Proxy(noop, handler) as unknown as RouteProxy;
}

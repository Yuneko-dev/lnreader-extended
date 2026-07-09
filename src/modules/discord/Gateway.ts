import EventEmitter from 'eventemitter3';

import { ReadyEvent } from './events';
import {
  DEFAULT_SUPER_PROPERTIES,
  DEFAULTS,
  GatewayOp,
} from './utils/Constants';
import GatewayCapabilities from './utils/GatewayCapabilities';
import Intents from './utils/Intents';

export interface IdentifyPayload {
  capabilities?: number;
  intents?: number;
  properties?: Record<string, unknown>;
  [extra: string]: unknown;
}

export interface GatewayConnectOptions {
  token: string;
  /** Override or extend the IDENTIFY payload. */
  identify?: IdentifyPayload;
  /** Override the gateway base URL. Default: wss://gateway.discord.gg */
  gatewayUrl?: string;
  /** Gateway version. Default: 9 */
  version?: number;
  /** Extra headers on the WS upgrade request (e.g. cookies). */
  wsHeaders?: Record<string, string>;
  /** Hard timeout waiting for HELLO. Default 20000. */
  helloTimeoutMs?: number;
  /** Abort the entire connect attempt. */
  signal?: AbortSignal;
}

export interface GatewayPacket<T = unknown> {
  op: number;
  d: T;
  s: number | null;
  t: string | null;
}

export interface GatewayCloseInfo {
  code: number;
  reason: string;
}

export interface GatewayClient {
  on(event: 'open', listener: () => void): this;
  on(
    event: 'hello',
    listener: (data: { heartbeat_interval: number }) => void,
  ): this;
  on(event: 'identify', listener: () => void): this;
  on(event: 'ready', listener: (data: ReadyEvent) => void): this;
  on(
    event: 'dispatch',
    listener: (eventName: string, data: unknown, seq: number | null) => void,
  ): this;
  on(event: 'packet', listener: (packet: GatewayPacket) => void): this;
  on(event: 'sent', listener: (packet: unknown) => void): this;
  on(event: 'close', listener: (info: GatewayCloseInfo) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'debug', listener: (msg: string) => void): this;

  once(event: 'open', listener: () => void): this;
  once(
    event: 'hello',
    listener: (data: { heartbeat_interval: number }) => void,
  ): this;
  once(event: 'identify', listener: () => void): this;
  once(event: 'ready', listener: (data: ReadyEvent) => void): this;
  once(
    event: 'dispatch',
    listener: (eventName: string, data: unknown, seq: number | null) => void,
  ): this;
  once(event: 'packet', listener: (packet: GatewayPacket) => void): this;
  once(event: 'sent', listener: (packet: unknown) => void): this;
  once(event: 'close', listener: (info: GatewayCloseInfo) => void): this;
  once(event: 'error', listener: (err: Error) => void): this;
  once(event: 'debug', listener: (msg: string) => void): this;
}

/**
 * 100% stateless Discord Gateway transport (single connection).
 *
 * - Holds NO domain entities.
 * - Holds NO state across `connect()` calls. The caller persists session_id /
 *   seq / resume_gateway_url externally (via the `session` event) and feeds
 *   them back in to resume.
 * - Per-connection ephemerals (live `seq`, last-ack flag, heartbeat timer) are
 *   released when the socket closes.
 * - Does NOT auto-reconnect. Caller orchestrates retries using `close.resumable`.
 *
 * Events:
 *   "open"      — ws upgrade succeeded
 *   "hello"     — HELLO received { heartbeat_interval }
 *   "identify"  — about to send IDENTIFY
 *   "resume"    — about to send RESUME
 *   "ready"     — READY dispatch payload
 *   "resumed"   — RESUMED dispatch
 *   "dispatch"  — (eventName, data, seq) for every op-0 dispatch
 *   "packet"    — raw inbound packet (every op)
 *   "sent"      — raw outbound packet
 *   "session"   — { session_id, seq, resume_gateway_url } whenever any changes
 *   "invalidSession" — (resumable: boolean) before forced close
 *   "close"     — GatewayCloseInfo
 *   "error"     — Error
 *   "debug"     — string
 */
export class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private firstHeartbeatTimer: NodeJS.Timeout | null = null;
  private helloTimer: NodeJS.Timeout | null = null;
  private lastAck = true;
  private lastHeartbeatAt = 0;
  private ping = -1;

  private token = '';
  private closed = false;

  constructor() {
    super();
  }

  /** Latency in ms of the most recent heartbeat round-trip; -1 before first ack. */
  get latency(): number {
    return this.ping;
  }

  /**
   * Open a gateway connection. Resolves on READY (fresh) or RESUMED (resume),
   * rejects on early close/abort. Use the returned promise just to await
   * "we're live" — events do the actual work.
   */
  connect(opts: GatewayConnectOptions): Promise<void> {
    if (this.ws) {
      throw new Error(
        'GatewayClient already connected; create a new instance per session',
      );
    }
    this.token = opts.token;
    this.closed = false;
    this.lastAck = true;

    const base = opts.gatewayUrl ?? DEFAULTS.GATEWAY_URL;
    const version = opts.version ?? DEFAULTS.GATEWAY_VERSION;
    const url = `${base}/?v=${version}&encoding=json`;

    this.debug(`[gateway] connecting ${url}`);
    const ws = new WebSocket(url);
    this.ws = ws;

    return new Promise<void>((resolve, reject) => {
      const helloTimeout = opts.helloTimeoutMs ?? DEFAULTS.HELLO_TIMEOUT_MS;
      this.helloTimer = setTimeout(() => {
        this.debug('[gateway] HELLO timeout');
        this.forceClose(4009, 'HELLO timeout');
      }, helloTimeout);

      const onAbort = (): void => {
        this.debug('[gateway] connect aborted');
        this.forceClose(1000, 'aborted');
        reject(new Error('connect aborted'));
      };
      if (opts.signal) {
        if (opts.signal.aborted) {
          onAbort();
          return;
        }
        opts.signal.addEventListener('abort', onAbort, { once: true });
      }

      const settle = (ok: boolean, err?: unknown): void => {
        opts.signal?.removeEventListener('abort', onAbort);
        this.removeListener('ready', onReady);
        this.removeListener('close', onClose);
        if (ok) resolve();
        else reject(err ?? new Error('gateway closed before ready'));
      };
      const onReady = (): void => settle(true);
      const onClose = (info: GatewayCloseInfo): void => settle(false, info);
      this.once('ready', onReady);
      this.once('close', onClose);

      ws.addEventListener('open', () => {
        this.debug('[gateway] open');
        this.emit('open');
      });
      ws.addEventListener('message', event =>
        this.handleMessage(event.data, opts),
      );
      ws.addEventListener('error', (event: any) => {
        const errMessage = event.message || 'Unknown Error';
        this.debug(`[gateway] ws error: ${errMessage}`);
        this.emit('error', new Error(errMessage));
      });
      ws.addEventListener('close', event =>
        this.handleClose(event.code, event.reason),
      );
    });
  }

  /**
   * Send a raw packet. The caller is responsible for op + d shape.
   * Returns false if the socket isn't open.
   */
  send(op: number, d: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    const packet = { op, d };
    try {
      this.ws.send(JSON.stringify(packet));
    } catch (err: any) {
      this.emit('error', err);
    }
    this.emit('sent', packet);
    return true;
  }

  /** Gracefully close the connection. Code 1000 = clean. */
  close(code = 1000, reason?: string): void {
    if (!this.ws) return;
    try {
      this.ws.close(code, reason);
    } catch {
      this.forceClose(code, reason ?? '');
    }
  }

  // --- internal protocol ----------------------------------------------------

  private handleMessage(data: any, opts: GatewayConnectOptions): void {
    const raw = typeof data === 'string' ? data : data.toString();

    let packet: GatewayPacket;
    try {
      packet = JSON.parse(raw) as GatewayPacket;
    } catch (err) {
      this.emit('error', err);
      return;
    }

    if (packet.s !== null && packet.s !== undefined) {
      // Seq ignored as resume is disabled
    }

    this.emit('packet', packet);

    switch (packet.op) {
      case GatewayOp.HELLO: {
        try {
          const interval = (packet.d as { heartbeat_interval: number })
            .heartbeat_interval;
          this.clearHelloTimer();
          this.startHeartbeat(interval);
          this.debug(
            `[gateway] HELLO received, heartbeat_interval=${interval}ms`,
          );
          this.emit('hello', { heartbeat_interval: interval });
          this.sendIdentify(opts);
        } catch (err: any) {
          this.emit(
            'error',
            new Error(`HELLO processing error: ${err.message}`),
          );
        }
        break;
      }
      case GatewayOp.HEARTBEAT_ACK:
        this.lastAck = true;
        this.ping = Date.now() - this.lastHeartbeatAt;
        this.debug(`[gateway] heartbeat ack (${this.ping}ms)`);
        break;
      case GatewayOp.HEARTBEAT:
        this.debug(
          '[gateway] received server heartbeat (op=1), sending forced heartbeat',
        );
        this.sendHeartbeat(true);
        break;
      case GatewayOp.RECONNECT:
        this.debug('[gateway] server requested RECONNECT');
        this.forceClose(4000, 'server reconnect');
        break;
      case GatewayOp.INVALID_SESSION: {
        this.debug(`[gateway] INVALID_SESSION, closing...`);
        this.forceClose(1000, 'invalid session');
        break;
      }
      case GatewayOp.DISPATCH:
        try {
          this.handleDispatch(packet);
        } catch (err: any) {
          this.emit(
            'error',
            new Error(`DISPATCH processing error: ${err.message}`),
          );
        }
        break;
      default:
        // Unknown op — already emitted as "packet". No further action.
        break;
    }
  }

  private handleDispatch(packet: GatewayPacket): void {
    const t = packet.t ?? '';
    if (t === 'READY') {
      const d = packet.d as ReadyEvent;
      this.debug(
        `[gateway] READY: user=${d.user.username} (${d.user.id}) global_name=${
          d.user.global_name ?? '?'
        }`,
      );
      this.emit('ready', d);
    } else {
      this.debug(`[gateway] dispatch ${t} seq=${packet.s ?? 'null'}`);
    }
    this.emit('dispatch', t, packet.d, packet.s);
  }

  private sendIdentify(opts: GatewayConnectOptions): void {
    const id = opts.identify ?? {};
    const capabilities = new GatewayCapabilities(id.capabilities ?? 0);
    if (id.capabilities === null || id.capabilities === undefined) {
      capabilities.add(GatewayCapabilities.FLAGS.DEDUPE_USER_OBJECTS);
      capabilities.add(GatewayCapabilities.FLAGS.PRIORITIZED_READY_PAYLOAD);
      capabilities.add(GatewayCapabilities.FLAGS.AUTO_CALL_CONNECT);
      capabilities.add(GatewayCapabilities.FLAGS.AUTO_LOBBY_CONNECT);
    }
    capabilities.freeze();
    const intents = new Intents(id.intents ?? 0);
    if (!id.intents) {
      intents.add(Intents.FLAGS.DIRECT_MESSAGES);
      intents.add(Intents.FLAGS.PRIVATE_CHANNELS);
      intents.add(Intents.FLAGS.CALLS);
      intents.add(Intents.FLAGS.USER_RELATIONSHIPS);
      intents.add(Intents.FLAGS.USER_PRESENCE);
      intents.add(Intents.FLAGS.LOBBIES);
      intents.add(Intents.FLAGS.LOBBY_DELETE);
      intents.add(Intents.FLAGS.UNKNOWN_29);
    }
    intents.freeze();
    const d: Record<string, unknown> = {
      capabilities: capabilities.bitfield,
      intents: intents.bitfield,
      token: this.token,
      properties: DEFAULT_SUPER_PROPERTIES,
    };
    this.emit('identify');
    this.debug('[gateway] sending IDENTIFY', d);
    this.send(GatewayOp.IDENTIFY, d);
  }

  private startHeartbeat(intervalMs: number): void {
    this.stopHeartbeat();
    this.debug(`[gateway] heartbeat every ${intervalMs}ms`);
    // Per docs: first heartbeat should be sent after `interval * jitter`. Keep simple: jitter on first only.
    const firstDelay = Math.floor(intervalMs * Math.random());
    this.firstHeartbeatTimer = setTimeout(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.sendHeartbeat();
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), intervalMs);
      this.firstHeartbeatTimer = null;
    }, firstDelay);
  }

  private sendHeartbeat(force = false): void {
    if (!force && !this.lastAck) {
      this.debug(
        '[gateway] zombie connection (no heartbeat ack); closing 4009',
      );
      this.forceClose(4009, 'heartbeat ack missed');
      return;
    }
    this.lastAck = false;
    this.lastHeartbeatAt = Date.now();
    this.send(GatewayOp.HEARTBEAT, null);
    this.debug(`[gateway] heartbeat dispatched seq=null`);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.firstHeartbeatTimer) {
      clearTimeout(this.firstHeartbeatTimer);
      this.firstHeartbeatTimer = null;
    }
  }

  private clearHelloTimer(): void {
    if (this.helloTimer) {
      clearTimeout(this.helloTimer);
      this.helloTimer = null;
    }
  }

  private forceClose(code: number, reason: string): void {
    if (this.ws) {
      try {
        this.ws.close(code, reason);
      } catch {
        // ignore
      }
    }
  }

  private handleClose(code: number, reason: string): void {
    if (this.closed) return;
    this.closed = true;
    this.stopHeartbeat();
    this.clearHelloTimer();
    this.ws = null;
    const info: GatewayCloseInfo = {
      code,
      reason,
    };
    this.debug(`[gateway] close code=${code} reason=${reason}`);
    this.emit('close', info);
  }

  private debug(...msg: any): void {
    this.emit('debug', ...msg);
  }
}

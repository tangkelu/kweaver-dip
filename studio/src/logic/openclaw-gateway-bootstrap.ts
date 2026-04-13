import { collectMissingRequirements } from "./guide";
import { OpenClawGatewayClient } from "../infra/openclaw-gateway-client";
import { getEnv } from "../utils/env";

const OPENCLAW_GATEWAY_RETRY_DELAY_MS = 1_000;

let reconnectTimer: NodeJS.Timeout | undefined;
let reconnectInFlight = false;

/**
 * Minimal gateway connector contract used by bootstrap flows.
 */
export interface OpenClawGatewayConnector {
  /**
   * Reconfigures the target gateway endpoint.
   *
   * @param url Gateway WebSocket URL.
   * @param token Optional gateway bearer token.
   */
  reconfigureConnection(url: string, token?: string): void;

  /**
   * Establishes the gateway WebSocket connection.
   *
   * @returns Nothing once connected.
   */
  connect(): Promise<void>;
}

/**
 * Options used by gateway bootstrap helpers.
 */
export interface OpenClawGatewayBootstrapOptions {
  /**
   * Studio root used to inspect initialization files.
   */
  studioRootDir?: string;

  /**
   * Optional connector override used by tests.
   */
  connector?: OpenClawGatewayConnector;

  /**
   * Optional environment reader used by tests.
   */
  envReader?: typeof getEnv;

  /**
   * Optional scheduler override used by tests.
   */
  scheduleRetry?: typeof setTimeout;
}

/**
 * Connects to the configured OpenClaw Gateway only when Studio is initialized.
 *
 * @param options Optional studio root, connector, and env reader overrides.
 * @returns `true` when a connection attempt was performed, otherwise `false`.
 */
export async function connectOpenClawGatewayIfInitialized(
  options: OpenClawGatewayBootstrapOptions = {}
): Promise<boolean> {
  const studioRootDir = options.studioRootDir ?? process.cwd();
  const missing = await collectMissingRequirements(studioRootDir);

  if (missing.length > 0) {
    return false;
  }

  const envReader = options.envReader ?? getEnv;
  const env = envReader();
  scheduleGatewayReconnect({
    url: env.openClawGatewayUrl,
    token: env.openClawGatewayToken,
    timeoutMs: env.openClawGatewayTimeoutMs,
    connector: options.connector,
    scheduleRetry: options.scheduleRetry
  });

  return true;
}

/**
 * Starts a background reconnect loop for the OpenClaw Gateway.
 *
 * The loop attempts one immediate connection. When the gateway is temporarily
 * unavailable, it logs the failure and retries every second until successful.
 *
 * @param options Target gateway connection settings.
 */
function scheduleGatewayReconnect(options: {
  url: string;
  token?: string;
  timeoutMs?: number;
  connector?: OpenClawGatewayConnector;
  scheduleRetry?: typeof setTimeout;
}): void {
  const scheduleRetry = options.scheduleRetry ?? setTimeout;

  if (reconnectTimer !== undefined || reconnectInFlight) {
    return;
  }

  const attemptConnection = async (): Promise<void> => {
    if (reconnectInFlight) {
      return;
    }

    reconnectInFlight = true;

    try {
      await connectOpenClawGateway(options);
      reconnectTimer = undefined;
    } catch (error) {
      console.warn(
        "[openclaw-gateway-bootstrap] OpenClaw Gateway unavailable, retrying in 1s:",
        error
      );
      reconnectTimer = scheduleRetry(() => {
        reconnectTimer = undefined;
        void attemptConnection();
      }, OPENCLAW_GATEWAY_RETRY_DELAY_MS);
    } finally {
      reconnectInFlight = false;
    }
  };

  void attemptConnection();
}

/**
 * Connects to one OpenClaw Gateway endpoint immediately.
 *
 * @param options Target gateway connection settings.
 * @returns Nothing once connected.
 */
export async function connectOpenClawGateway(options: {
  url: string;
  token?: string;
  timeoutMs?: number;
  connector?: OpenClawGatewayConnector;
}): Promise<void> {
  const connector =
    options.connector ??
    OpenClawGatewayClient.getInstance({
      url: options.url,
      token: options.token,
      timeoutMs: options.timeoutMs
    });

  connector.reconfigureConnection(options.url, options.token);
  await connector.connect();
}

import type {
  OpenClawGatewayPort,
  OpenClawRequestFrame
} from "../types/openclaw";
import type {
  OpenClawSessionGetParams,
  OpenClawSessionGetResult,
  OpenClawSessionsListParams,
  OpenClawSessionsListResult,
  OpenClawSessionsPreviewParams,
  OpenClawSessionsPreviewResult
} from "../types/sessions";

/**
 * Outbound adapter used to fetch OpenClaw sessions through the gateway port.
 */
export interface OpenClawSessionsAdapter {
  /**
   * Fetches sessions using OpenClaw `sessions.list`.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw sessions list payload.
   */
  listSessions(params: OpenClawSessionsListParams): Promise<OpenClawSessionsListResult>;

  /**
   * Fetches one session detail using OpenClaw `sessions.get`.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw session detail payload.
   */
  getSession(params: OpenClawSessionGetParams): Promise<OpenClawSessionGetResult>;

  /**
   * Fetches previews for multiple sessions using OpenClaw `sessions.preview`.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw session previews payload.
   */
  previewSessions(
    params: OpenClawSessionsPreviewParams
  ): Promise<OpenClawSessionsPreviewResult>;
}

/**
 * Creates the OpenClaw `sessions.list` request.
 *
 * @param requestId The frame correlation id.
 * @param params Query parameters forwarded to OpenClaw.
 * @returns A serialized OpenClaw request frame.
 */
export function createSessionsListRequest(
  requestId: string,
  params: OpenClawSessionsListParams
): OpenClawRequestFrame {
  return {
    type: "req",
    id: requestId,
    method: "sessions.list",
    params
  };
}

/**
 * Creates the OpenClaw `sessions.get` request.
 *
 * @param requestId The frame correlation id.
 * @param params Query parameters forwarded to OpenClaw.
 * @returns A serialized OpenClaw request frame.
 */
export function createSessionsGetRequest(
  requestId: string,
  params: OpenClawSessionGetParams
): OpenClawRequestFrame {
  return {
    type: "req",
    id: requestId,
    method: "sessions.get",
    params
  };
}

/**
 * Creates the OpenClaw `sessions.preview` request.
 *
 * @param requestId The frame correlation id.
 * @param params Query parameters forwarded to OpenClaw.
 * @returns A serialized OpenClaw request frame.
 */
export function createSessionsPreviewRequest(
  requestId: string,
  params: OpenClawSessionsPreviewParams
): OpenClawRequestFrame {
  return {
    type: "req",
    id: requestId,
    method: "sessions.preview",
    params
  };
}

/**
 * Adapter that translates sessions queries to OpenClaw Gateway JSON RPC.
 */
export class OpenClawSessionsGatewayAdapter implements OpenClawSessionsAdapter {
  /**
   * Creates the adapter.
   *
   * @param gatewayPort The OpenClaw Gateway RPC port.
   */
  public constructor(private readonly gatewayPort: OpenClawGatewayPort) {}

  /**
   * Queries `sessions.list` over the gateway RPC port.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw sessions list payload.
   */
  public async listSessions(
    params: OpenClawSessionsListParams
  ): Promise<OpenClawSessionsListResult> {
    return this.gatewayPort.invoke<OpenClawSessionsListResult>(
      createSessionsListRequest("sessions.list", params)
    );
  }

  /**
   * Queries `sessions.get` over the gateway RPC port.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw session detail payload.
   */
  public async getSession(
    params: OpenClawSessionGetParams
  ): Promise<OpenClawSessionGetResult> {
    return this.gatewayPort.invoke<OpenClawSessionGetResult>(
      createSessionsGetRequest("sessions.get", params)
    );
  }

  /**
   * Queries `sessions.preview` over the gateway RPC port.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw sessions preview payload.
   */
  public async previewSessions(
    params: OpenClawSessionsPreviewParams
  ): Promise<OpenClawSessionsPreviewResult> {
    return this.gatewayPort.invoke<OpenClawSessionsPreviewResult>(
      createSessionsPreviewRequest("sessions.preview", params)
    );
  }
}

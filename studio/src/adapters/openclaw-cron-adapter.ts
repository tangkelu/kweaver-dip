import type {
  OpenClawGatewayPort,
  OpenClawRequestFrame
} from "../types/openclaw";
import type {
  OpenClawCronListParams,
  OpenClawCronListResult,
  OpenClawCronRunsParams,
  OpenClawCronRunsResult
} from "../types/plan";

/**
 * Outbound adapter used to fetch OpenClaw cron data through the gateway port.
 */
export interface OpenClawCronAdapter {
  /**
   * Fetches cron jobs using OpenClaw `cron.list`.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw cron jobs list payload.
   */
  listCronJobs(params: OpenClawCronListParams): Promise<OpenClawCronListResult>;

  /**
   * Fetches cron run history using OpenClaw `cron.runs`.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw cron runs payload.
   */
  listCronRuns(params: OpenClawCronRunsParams): Promise<OpenClawCronRunsResult>;
}

/**
 * Creates the OpenClaw `cron.list` request.
 *
 * @param requestId The frame correlation id.
 * @param params Query parameters forwarded to OpenClaw.
 * @returns A serialized OpenClaw request frame.
 */
export function createCronListRequest(
  requestId: string,
  params: OpenClawCronListParams
): OpenClawRequestFrame {
  return {
    type: "req",
    id: requestId,
    method: "cron.list",
    params
  };
}

/**
 * Creates the OpenClaw `cron.runs` request.
 *
 * @param requestId The frame correlation id.
 * @param params Query parameters forwarded to OpenClaw.
 * @returns A serialized OpenClaw request frame.
 */
export function createCronRunsRequest(
  requestId: string,
  params: OpenClawCronRunsParams
): OpenClawRequestFrame {
  return {
    type: "req",
    id: requestId,
    method: "cron.runs",
    params
  };
}

/**
 * Adapter that translates cron queries to OpenClaw Gateway JSON RPC.
 */
export class OpenClawCronGatewayAdapter implements OpenClawCronAdapter {
  /**
   * Creates the adapter.
   *
   * @param gatewayPort The OpenClaw Gateway RPC port.
   */
  public constructor(private readonly gatewayPort: OpenClawGatewayPort) {}

  /**
   * Queries `cron.list` over the gateway RPC port.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw cron jobs list payload.
   */
  public async listCronJobs(
    params: OpenClawCronListParams
  ): Promise<OpenClawCronListResult> {
    return this.gatewayPort.invoke<OpenClawCronListResult>(
      createCronListRequest("cron.list", params)
    );
  }

  /**
   * Queries `cron.runs` over the gateway RPC port.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw cron runs payload.
   */
  public async listCronRuns(
    params: OpenClawCronRunsParams
  ): Promise<OpenClawCronRunsResult> {
    return this.gatewayPort.invoke<OpenClawCronRunsResult>(
      createCronRunsRequest("cron.runs", params)
    );
  }
}

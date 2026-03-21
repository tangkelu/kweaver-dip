import type { OpenClawCronAdapter } from "../adapters/openclaw-cron-adapter";
import type {
  OpenClawCronListParams,
  OpenClawCronListResult,
  OpenClawCronRunsParams,
  OpenClawCronRunsResult
} from "../types/plan";

/**
 * Application logic used to fetch cron jobs and run history.
 */
export interface CronLogic {
  /**
   * Fetches cron jobs with the requested filters.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The cron jobs list payload.
   */
  listCronJobs(params: OpenClawCronListParams): Promise<OpenClawCronListResult>;

  /**
   * Fetches cron run history with the requested filters.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The cron runs payload.
   */
  listCronRuns(params: OpenClawCronRunsParams): Promise<OpenClawCronRunsResult>;
}

/**
 * Logic implementation backed by OpenClaw cron APIs.
 */
export class DefaultCronLogic implements CronLogic {
  /**
   * Creates the cron logic.
   *
   * @param openClawCronAdapter The adapter used to fetch OpenClaw cron data.
   */
  public constructor(private readonly openClawCronAdapter: OpenClawCronAdapter) {}

  /**
   * Fetches cron jobs from OpenClaw.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The cron jobs list payload.
   */
  public async listCronJobs(
    params: OpenClawCronListParams
  ): Promise<OpenClawCronListResult> {
    return this.openClawCronAdapter.listCronJobs(params);
  }

  /**
   * Fetches cron runs from OpenClaw.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The cron runs payload.
   */
  public async listCronRuns(
    params: OpenClawCronRunsParams
  ): Promise<OpenClawCronRunsResult> {
    return this.openClawCronAdapter.listCronRuns(params);
  }
}

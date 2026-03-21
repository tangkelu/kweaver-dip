import type { OpenClawSessionsAdapter } from "../adapters/openclaw-sessions-adapter";
import type {
  OpenClawSessionGetParams,
  OpenClawSessionGetResult,
  OpenClawSessionsListParams,
  OpenClawSessionsListResult,
  OpenClawSessionsPreviewParams,
  OpenClawSessionsPreviewResult
} from "../types/sessions";

/**
 * Application logic used to fetch sessions and message previews.
 */
export interface SessionsLogic {
  /**
   * Fetches sessions list.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw sessions list payload.
   */
  listSessions(params: OpenClawSessionsListParams): Promise<OpenClawSessionsListResult>;

  /**
   * Fetches one session detail.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw session detail payload.
   */
  getSession(params: OpenClawSessionGetParams): Promise<OpenClawSessionGetResult>;

  /**
   * Fetches previews for multiple sessions.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw sessions preview payload.
   */
  previewSessions(
    params: OpenClawSessionsPreviewParams
  ): Promise<OpenClawSessionsPreviewResult>;
}

/**
 * Logic implementation backed by OpenClaw sessions APIs.
 */
export class DefaultSessionsLogic implements SessionsLogic {
  /**
   * Creates the sessions logic.
   *
   * @param openClawSessionsAdapter The adapter used to fetch OpenClaw sessions data.
   */
  public constructor(
    private readonly openClawSessionsAdapter: OpenClawSessionsAdapter
  ) {}

  /**
   * Fetches sessions list from OpenClaw.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw sessions list payload.
   */
  public async listSessions(
    params: OpenClawSessionsListParams
  ): Promise<OpenClawSessionsListResult> {
    return this.openClawSessionsAdapter.listSessions(params);
  }

  /**
   * Fetches session detail from OpenClaw.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw session detail payload.
   */
  public async getSession(
    params: OpenClawSessionGetParams
  ): Promise<OpenClawSessionGetResult> {
    return this.openClawSessionsAdapter.getSession(params);
  }

  /**
   * Fetches sessions preview from OpenClaw.
   *
   * @param params Query parameters forwarded to OpenClaw.
   * @returns The OpenClaw sessions preview payload.
   */
  public async previewSessions(
    params: OpenClawSessionsPreviewParams
  ): Promise<OpenClawSessionsPreviewResult> {
    return this.openClawSessionsAdapter.previewSessions(params);
  }
}

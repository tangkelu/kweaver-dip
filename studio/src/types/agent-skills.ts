/**
 * Public response returned when listing globally available skill ids.
 */
export interface AgentSkillsCatalog {
  /**
   * Discoverable skill ids exposed by the OpenClaw plugin.
   */
  skills: string[];
}

/**
 * Public response returned for one agent's configured skill ids.
 */
export interface AgentSkillsBinding {
  /**
   * Stable OpenClaw agent identifier.
   */
  agentId: string;

  /**
   * Effective skill ids for the agent.
   */
  skills: string[];
}

/**
 * Request body used to replace one agent's skill binding set.
 */
export interface UpdateAgentSkillsRequest {
  /**
   * Replacement skill ids. May be an empty array to clear bindings.
   */
  skills: string[];
}

/**
 * Response returned after a successful skill binding update.
 */
export interface UpdateAgentSkillsResult extends AgentSkillsBinding {
  /**
   * Indicates whether the upstream plugin accepted the update.
   */
  success: boolean;
}

/**
 * Response returned after installing a `.skill` zip via the DIP Gateway route.
 */
export interface InstallSkillResult {
  /**
   * Installed skill id (directory name under `skills/`).
   */
  skillName: string;

  /**
   * Absolute path written by the plugin (Gateway host filesystem).
   */
  skillPath: string;
}

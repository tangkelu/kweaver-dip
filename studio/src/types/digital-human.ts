/**
 * Describes the public digital human payload exposed by DIP Studio.
 */
export interface DigitalHuman {
  /**
   * Stable digital human identifier.
   */
  id: string;

  /**
   * Human-readable digital human name.
   */
  name: string;

  /**
   * Job position / role label (from IDENTITY.md `Creature`).
   */
  creature?: string;
}

/**
 * Public digital human list response.
 */
export type DigitalHumanList = DigitalHuman[];

/**
 * One globally available skill item.
 */
export interface DigitalHumanSkill {
  /**
   * Human-readable skill name / key.
   */
  name: string;

  /**
   * Human-readable description.
   */
  description?: string;
}

/**
 * One skill item returned for a specific digital human.
 */
export interface DigitalHumanAgentSkill {
  /**
   * Human-readable skill name / key.
   */
  name: string;

  /**
   * Human-readable description.
   */
  description?: string;

  /**
   * Whether the target digital human currently enables this skill.
   * This field is used internally by the backend merge logic and is not
   * exposed by the public API schema for `/digital-human/{id}/skills`.
   */
  enabled?: boolean;
}

/**
 * Global skill list response returned by the skills query API.
 */
export type DigitalHumanSkillList = DigitalHumanSkill[];

/**
 * Agent skill list response returned by the digital human skill API.
 */
export type DigitalHumanAgentSkillList = DigitalHumanAgentSkill[];

/**
 * Unified settings template for a digital employee.
 *
 * Acts as a bidirectional conversion hub between the Studio HTTP API
 * and OpenClaw workspace files (IDENTITY.md + SOUL.md).
 */
export interface DigitalHumanTemplate {
  /**
   * Fields projected to / from IDENTITY.md.
   */
  identity: {
    /**
     * Display name (maps to IDENTITY.md `Name`).
     */
    name: string;

    /**
     * Job position / role label (maps to IDENTITY.md `Creature`).
     */
    creature?: string;
  };

  /**
   * Raw markdown content written to / read from SOUL.md.
   */
  soul: string;

  /**
   * Business Knowledge Network entries parsed from / rendered to SOUL.md.
   */
  bkn?: BknEntry[];
}

/**
 * A single entry in the Business Knowledge Network (BKN).
 * Stored as a markdown table row inside SOUL.md but exposed
 * as a structured field in the API.
 */
export interface BknEntry {
  /**
   * Human-readable name of the knowledge source.
   */
  name: string;

  /**
   * URL pointing to the knowledge source.
   */
  url: string;
}

/**
 * Supported IM channel providers for OpenClaw `bindings` / `channels` config.
 */
export type DigitalHumanChannelType = "feishu" | "dingtalk";

/**
 * Channel configuration used to bind a messaging channel to the agent.
 */
export interface ChannelConfig {
  /**
   * Channel provider. Defaults to `feishu` when omitted (backward compatible).
   */
  type?: DigitalHumanChannelType;

  /**
   * Application identifier issued by the channel provider.
   * For Feishu and DingTalk, this selects the OpenClaw `channels.<provider>.accounts` key
   * (normalized); each distinct app id maps to one account and at most one bound agent.
   */
  appId: string;

  /**
   * Application secret issued by the channel provider.
   */
  appSecret: string;
}

/**
 * Describes the request body for creating a new digital human.
 */
export interface CreateDigitalHumanRequest {
  /**
   * Optional UUID. When omitted the backend generates one automatically.
   */
  id?: string;

  /**
   * Display name for the digital human (maps to IDENTITY.md `Name`).
   */
  name: string;

  /**
   * Job position / role label (maps to IDENTITY.md `Creature`).
   */
  creature?: string;

  /**
   * Markdown content describing the role persona (written to SOUL.md).
   */
  soul?: string;

  /**
   * Skill names to bind to the agent.
   */
  skills?: string[];

  /**
   * Business Knowledge Network entries.
   * Stored as a markdown table appended to SOUL.md.
   */
  bkn?: BknEntry[];

  /**
   * Channel binding configuration.
   */
  channel?: ChannelConfig;
}

/**
 * Describes the response after successfully creating a digital human.
 * Mirrors the input request shape with the addition of a guaranteed `id`.
 */
export interface CreateDigitalHumanResult {
  /**
   * Stable digital human identifier (UUID).
   */
  id: string;

  /**
   * Human-readable digital human name.
   */
  name: string;

  /**
   * Job position / role label.
   */
  creature?: string;

  /**
   * Markdown content describing the role persona.
   */
  soul?: string;

  /**
   * Skill names currently bound to the agent.
   */
  skills?: string[];

  /**
   * Business Knowledge Network entries.
   */
  bkn?: BknEntry[];

  /**
   * Channel binding configuration.
   */
  channel?: ChannelConfig;
}

/**
 * Detail response returned by GET /digital-human/:id.
 */
export interface DigitalHumanDetail {
  /**
   * Stable digital human identifier.
   */
  id: string;

  /**
   * Human-readable digital human name.
   */
  name: string;

  /**
   * Job position / role label (IDENTITY.md `Creature`).
   */
  creature?: string;

  /**
   * Role persona markdown (SOUL.md body, excluding the BKN table block).
   */
  soul: string;

  /**
   * Business Knowledge Network entries (from SOUL.md table).
   */
  bkn?: BknEntry[];

  /**
   * Skill names currently configured on the agent.
   */
  skills?: string[];

  /**
   * Messaging channel credentials when this agent is bound to Feishu or DingTalk
   * (from OpenClaw config `bindings` + `channels.feishu` / `channels.dingtalk`).
   */
  channel?: ChannelConfig;
}

/**
 * Partial update body for PUT /digital-human/:id.
 */
export interface UpdateDigitalHumanRequest {
  /**
   * Display name (IDENTITY.md `Name`).
   */
  name?: string;

  /**
   * Job position / role label (IDENTITY.md `Creature`).
   */
  creature?: string;

  /**
   * Role persona markdown (SOUL.md).
   */
  soul?: string;

  /**
   * When present, replaces the full skill set bound to the agent (may be empty).
   */
  skills?: string[];

  /**
   * When present, replaces BKN entries stored in SOUL.md.
   */
  bkn?: BknEntry[];

  /**
   * Channel binding (same semantics as create).
   */
  channel?: ChannelConfig;
}

/**
 * Response after PUT /digital-human/:id (mirrors create result shape).
 */
export interface UpdateDigitalHumanResult {
  id: string;
  name: string;
  creature?: string;
  soul?: string;
  skills?: string[];
  bkn?: BknEntry[];
  channel?: ChannelConfig;
}

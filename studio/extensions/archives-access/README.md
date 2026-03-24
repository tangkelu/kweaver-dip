# OpenClaw Archives Access Plugin

The `archives-access` plugin allows external systems to securely read files and list directories within an agent's `archives` workspace directory via the OpenClaw Gateway HTTP server. It also enforces a dual-track archiving structure to keep the workspace organized.

## Features
- **Dual-Track Archiving**: Automatically organizes files into `archives/{ARCHIVE_ID}/PLAN.md` (uppercase) or `archives/{ARCHIVE_ID}/{TIMESTAMP}/{ORIGIN_NAME}`.
- **Auto-Compliance**: Listens for file modifications and automatically moves non-compliant files to their correct archival paths.
- **Improved Listing Logic**:
    - **Session Normalization**: Supports complex session keys (e.g., `agent:de_finance:user:...:uuid`) by extracting the UUID for path resolution.
    - **Session-Direct Access**: Providing a `session` query parameter directly lists the session's contents.
    - **Converged Path Response**: Returns paths relative to the session root for a cleaner view.
- **Zero-Trust Security**: Path traversal protection strictly blocks access outside the `archives` directory.

---

## Installation & Configuration

Because `archives-access` is a built-in workspace extension, it resides directly in the `extensions/archives-access` directory of the OpenClaw repository.

### 1. Enable the Plugin

To load the plugin into your OpenClaw Gateway, you must explicitly enable it in your global OpenClaw configuration file (`~/.openclaw/openclaw.json`). 

Find the `"plugins"` section and add `"archives-access"` to the `"entries"`:

```json
  "plugins": {
    "entries": {
      "archives-access": {
        "enabled": true
      }
    }
  }
```

### 2. Restart the Gateway

Restart your active gateway process so that the plugin registry picks up the changes:
- If running in Development mode: Stop your terminal and rerun `pnpm gateway:watch`.
- If running the background daemon: Run `openclaw gateway restart`.

---

## Archiving Rules

The plugin automatically maintains a compliant structure for all files created or modified within the workspace:

1.  **Plan Files**: Files named `plan.md` (case-insensitive) are moved to `archives/{SESSION_UUID}/PLAN.md` (forced uppercase).
2.  **Archived Assets**: All other files are moved to `archives/{SESSION_UUID}/{YYYY-MM-DD-HH-mm-ss}/{ORIGIN_FILE_NAME}`.

This logic is triggered on the `after_tool_call` hook for any write/edit/replace tool.

---

## API Documentation

### `GET /v1/archives/{subpath}`

Fetches a file or lists a directory from a targeted agent's `archives` workspace.

**Headers Required:**
- `Authorization: Bearer <GATEWAY_TOKEN>`

**Query Parameters:**

| Parameter | Type     | Required | Description |
|:----------|:---------|:---------|:------------|
| `agent`   | `string` | **Yes**  | The ID of the agent whose workspace should be accessed. |
| `session` | `string` | No       | If provided, the API directly lists the contents of this session's archive directory. Supports complex session keys. |

**Path Parameters:**
- `{subpath}` (Optional): The relative path inside the `archives` folder. Supports complex session keys in the first segment.

---

### Request Examples & Responses

#### 1. Listing a Session Directory
Providing the `session` parameter (even a complex one) gives a direct list of its archived contents.

**Request:**
```bash
curl -i -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:18789/v1/archives?agent=de_finance&session=f78e9254-66e8-42a1-a8b3-5ca9dc07d174"
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "path": "/",
  "contents": [
    { "name": "PLAN.md", "type": "file" },
    { "name": "2026-03-24-10-21-30", "type": "directory" }
  ]
}
```

#### 2. Getting a Specific File
The plugin pipes the file contents directly with the correct `Content-Type`.

**Request:**
```bash
curl -i -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:18789/v1/archives/f78e9254-66e8-42a1-a8b3-5ca9dc07d174/PLAN.md?agent=de_finance"
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/markdown

# My Plan...
```

---

## Error Codes
- `403 Forbidden`: Path traversal attempt blocked.
- `404 Not Found`: Requested resource or target agent workspace not found.
- `500 Internal Server Error`: Unexpected filesystem or stream error.

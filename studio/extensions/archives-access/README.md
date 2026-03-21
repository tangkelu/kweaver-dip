# OpenClaw Archives Access Plugin

The `archives-access` plugin allows external systems to securely read files and list directories within an agent's `archives` workspace directory via the OpenClaw Gateway HTTP server.

## Features
- **Secure File Serving**: Read any file located in an agent's `archives` directory seamlessly.
- **Directory Listing**: Retrieve a JSON-structured list of files and subdirectories.
- **Agent Targeting**: Target specific agent workspaces dynamically using the `agent` parameter.
- **Session Filtering**: Filter root directory listings by a `session` prefix to easily locate session data.
- **Zero-Trust Security**: Built-in path traversal protection strictly blocks reading files outside the designated `archives` directory.

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

## API Documentation

### `GET /v1/archives/{subpath}`

Fetches a file or lists a directory from a targeted agent's `archives` workspace.

**Headers Required:**
- `Authorization: Bearer <GATEWAY_TOKEN>`

**Query Parameters:**

| Parameter | Type     | Required | Description |
|:----------|:---------|:---------|:------------|
| `agent`   | `string` | **Yes**  | The ID of the agent whose workspace should be accessed (e.g. `de_finance`, `coordinator`). The plugin will look up the workspace path dynamically from `openclaw.json`. |
| `session` | `string` | No       | When fetching the root `/v1/archives` directory, setting this filters the returned folder list to only include entries starting with this exact session ID. |

**Path Parameters:**
- `{subpath}` (Optional): The relative path to the intended file or directory inside the `archives` folder. Omit this to access the root archives folder. UTF-8 URL encoded paths (e.g., Chinese characters like `他的财务报表.md`) are natively supported.

---

### Request Examples & Responses

#### 1. Getting a Specific File
If the final subpath resolves to a file, the plugin will pipe the file contents directly in the response and automatically apply the relevant `Content-Type` header (e.g. `text/plain`, `application/pdf`, `image/png`).

**Request:**
```bash
curl -i -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:18789/v1/archives/5346e9bf-a493-4722-a1fc-93d857e96d94_2026-03-20-16-11-32/他的财务报表.md?agent=de_finance"
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/octet-stream

<... binary/text file contents ...>
```

#### 2. Listing a Directory Contents
If the targeted path is a directory (e.g. finding files inside a session), it returns a structured JSON payload denoting `file` or `directory` types.

**Request:**
```bash
curl -i -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:18789/v1/archives/5346e9bf-a493-4722-a1fc-93d857e96d94_2026-03-20-16-11-32?agent=de_finance"
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "path": "5346e9bf-a493-4722-a1fc-93d857e96d94_2026-03-20-16-11-32",
  "contents": [
    { "name": "他的财务报表.md", "type": "file" },
    { "name": "screenshots", "type": "directory" }
  ]
}
```

#### 3. Listing Base `archives` Directory with Session Filtering
To find the exact auto-generated session directory using just the session UUID prefix:

**Request:**
```bash
curl -i -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:18789/v1/archives/?agent=de_finance&session=5346e9bf-a493"
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "path": "/",
  "contents": [
    { "name": "5346e9bf-a493-4722-a1fc-93d857e96d94_2026-03-20-16-11-32", "type": "directory" }
  ]
}
```

---

## Error Codes
- `403 Forbidden`: Denies requested subpaths that attempt directory traversal (e.g. `../` or absolute paths outside the `archives` fold).
- `404 Not Found`: Returned if the requested file doesn't exist, the directory doesn't exist, or if the specified `agent` ID does not have a registered workspace.
- `500 Internal Server Error`: For unexpected fs or stream resolution errors.

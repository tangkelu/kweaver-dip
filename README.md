<p align="center">
  <img alt="KWeaver DIP" src="./assets/logo/kweaver-dip.png" width="320" />
</p>

[中文](./README.zh.md) | English

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

# KWeaver DIP

KWeaver DIP is an AI-native platform for developing and managing digital employees. It builds an application stack for digital employees that is understandable, executable, and governable, centered on business knowledge networks.

The platform is an enterprise digital employee platform built on the **KWeaver Core** open-source project. You can build and use agents through decision agents on a business knowledge network, or build and use digital worker on top of **Openclaw**.

## Quick Links

- 🌐 [Live Demo](https://dip-poc.aishu.cn/studio/agent/development/my-agent-list) — Try KWeaver online (username: `kweaver`, password: `111111`)

## Quick Start

### OpenClaw requirements

DIP Studio requires OpenClaw to be installed and running:

1. Deploy [OpenClaw](https://openclaw.ai) first. The supported version is `v2026.3.11`. You can also refer to the preparation notes in [kweaver-ai/dip-studio/studio/README.md](https://github.com/kweaver-ai/dip-studio/blob/main/studio/README.md).
2. Start OpenClaw Gateway.
3. Copy `gateway.auth.token` from `openclaw.json`, then run `openclaw gateway status` and record the gateway bind address and port.
4. Make sure the machine running `deploy.sh` can access the OpenClaw config file and workspace directory. If you want to preconfigure them, set `dipStudio.openClaw.configHostPath` and `dipStudio.openClaw.workspaceHostPath` in `deploy/conf/config.yaml` or in your custom config file.
5. Start OpenClaw in LAN mode: `openclaw gateway --bind lan`, listening on `0.0.0.0:18789`.

### Host prerequisites

Run install commands as `root` or through `sudo`.

```bash
# 1. Disable firewall
systemctl stop firewalld && systemctl disable firewalld

# 2. Disable swap
swapoff -a && sed -i '/ swap / s/^/#/' /etc/fstab

# 3. Set SELinux to permissive if needed
setenforce 0

# 4. Install containerd.io
dnf install containerd.io
```

```bash
# 1. Clone the repository
git clone https://github.com/kweaver-ai/kweaver-dip.git
cd kweaver-dip/deploy

# 2. Install KWeaver DIP
sudo ./deploy.sh kweaver-dip install

# 3. Install OpenClaw DIP extensions
openclaw plugins install ./openclaw-extensions/dip
```

### Authorization

After deployment, authorize OpenClaw to link with DIP Studio:

1. Run `openclaw devices list` and find the pending device shown below:

```bash
Pending (1)
┌──────────────────────────────────────┬──────────────────────────────────────────────────┬──────────┬───────────────┬──────────┬────────┐
│ Request                              │ Device                                           │ Role     │ IP            │ Age      │ Flags  │
├──────────────────────────────────────┼──────────────────────────────────────────────────┼──────────┼───────────────┼──────────┼────────┤
│ 3ef1700e-cc91-4978-a980-4fb783925028 │ cc8d2143cf8fcd04161ade9e5161006c410a0bee65f835e2 │ operator │ 192.169.0.104 │ just now │        │
│                                      │ 629792aa584bb119                                 │          │               │          │        │
└──────────────────────────────────────┴──────────────────────────────────────────────────┴──────────┴───────────────┴──────────┴────────┘
```

2. Run `openclaw devices approve <Request>` to approve it.

When you see:

```bash
Approved cc8d2143cf8fcd04161ade9e5161006c410a0bee65f835e2629792aa584bb119 (3ef1700e-cc91-4978-a980-4fb783925028)
```

the authorization has succeeded.

3. After authorization, you can access:

- `https://<node-ip>/deploy`: deployment console
- `https://<node-ip>/studio`: KWeaver Studio

Default username: `admin`
Initial password: `eisoo.com`

For full installation requirements, config details, flags, and offline deployment options, see [deploy/README.md](deploy/README.md).

## Community Reading Path

1. Read this file for an overall view of the project’s value, goals, and scope of capabilities.
2. Open each business module directory and read its `README.md` to learn what each module does.

## 💬 Community

<div align="center">
<img src="./docs/qrcode.png" alt="KWeaver community QR code" width="30%"/>

Scan to join the KWeaver community group
</div>

## Support & Contact

- **Contributing**: [Contributing Guide](rules/CONTRIBUTING.md)
- **Issues**: [GitHub Issues](https://github.com/kweaver-ai/kweaver/issues)
- **License**: [Apache License 2.0](LICENSE)

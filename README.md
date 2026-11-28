# desktop-images

The desktop images of a cloud enclave: remote Linux desktops streamed to a browser by
[Kyber](https://gitlab.com/kyber), one sandboxed VM per session, run by our session operator
(windbreak). This repository holds what the desktops are built from, and the source the licence
of the streaming software asks us to offer.

| Image | Folder | Contents |
|-------|--------|----------|
| `ghcr.io/blizter/desktop-work` | `work/` | KDE Plasma on a virtual screen, Firefox ESR, LibreOffice (Writer, Calc, Impress), VLC, the Nextcloud client, Element (Matrix), Dolphin, Konsole, KWrite; the Kyber 0.29.0 server and web client |

Built by `.github/workflows/images.yml` on our own runners, tagged `0.1.0-dev.<run>.g<short sha>`;
pushes to `main` publish. The images themselves are private: they are configured for our lab
(`work/element/config.json` names its Matrix server).

## VM disks

`ghcr.io/blizter/desktop-work-vm`: the same desktop as a bootable VM disk (qcow2), for sessions
that will run as full VMs, for hardware a container's VM can't pass through (a GPU, a camera).
[mkosi](https://github.com/systemd/mkosi) (`vm/mkosi.conf`) takes the published work image's
files and adds a kernel, systemd and systemd-boot. Published as an OCI artifact holding
`disk.qcow2` (zstd-compressed clusters): `oras pull ghcr.io/blizter/desktop-work-vm:<tag>`.

In a VM the desktop starts as it does in a pod, from the same contract (`vm/mkosi.extra/`):
cloud-init writes the session's settings (`/etc/windbreak/session.env`) and the account and
keyring files, as the session operator's VM runtime hands them over; `windbreak-home` mounts
the user's home disk (the VM's second disk, formatted when new) at `/home/user`;
`windbreak-desktop.service` runs `start-desktop` as uid 1000 on a read-only system. When the
desktop exits, the VM powers off. Booted by hand, with no settings, it stays at its console.
Not yet run on a hypervisor.

Built by the `vm` job on pushes to `main`, from the image the `work` job just pushed, or by hand
(Actions, Images, Run workflow) from a published tag given as `work_tag`.

## What an image may rely on

The desktop contract of the session operator: uid 1000, a read-only root, `HOME` (`/home/user`,
the user's volume) and `/tmp` (per session) the only writable paths, the desktop in the
foreground. The Kyber settings come from environment variables the operator sets;
`work/start-desktop` lists them. Login is OIDC only: basic logins, Kyber's JWT backend (on by
default, with a public development key), a second viewer and the clipboard are all off, set
explicitly.

## Licence

AGPL-3.0, the whole repository ([LICENSE](LICENSE)), the same as Kyber.

The Dockerfile and scripts are written from Kyber's public build instructions (kyber-desktop's and
kyber-web's READMEs) and the session operator's contract; they copy no third party's files. Kyber
is built from its release tag with the patches in `work/patches/` ([what each does and
why](work/patches/README.md)). Whoever uses one of these desktops over the network, or receives an
image, is owed the source of the Kyber it runs (AGPL section 13): upstream's release tag plus those
patches, built as `work/Dockerfile` builds it. This repository is that offer.

### Keyboard and mouse: through XTEST

Kyber as released sends keys and buttons through `/dev/uinput`, and only the absolute mouse
position through XTEST. A Kata VM's kernel has no uinput and loads no modules, so
`work/patches/kynput-xtest-input.patch` sends them through XTEST too when uinput is missing.
Gamepads still need uinput: none here.

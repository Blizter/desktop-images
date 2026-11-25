# desktop-images

The desktop images of a cloud enclave: remote Linux desktops streamed to a browser, one sandboxed
VM per session. This repository is the public half of the project. It holds what the desktops are
built from, and how we meet the licence of the streaming software they run.

## What will be here

| Part | What |
|------|------|
| Images | The Dockerfiles of the desktop images: KDE Plasma on a virtual screen, the apps, and the [Kyber](https://gitlab.com/kyber) server that streams the desktop. Each session runs one as a container in its own VM (Kata Containers) |
| VM images | How we build the disk images (ISOs) for sessions that run as full VMs, for hardware a container's VM can't pass through (a GPU, a camera) |
| Kyber's source | Our patches to Kyber and how to build the exact Kyber a desktop runs, from upstream's release tag |

The images move here from our private repository in later pushes.

## Licence

AGPL-3.0, the whole repository ([LICENSE](LICENSE)), the same as Kyber.

Kyber is AGPL-3.0. Whoever uses one of these desktops over the network may get the source of the
Kyber it runs (AGPL section 13), and so may anyone given an image. That source is Kyber's upstream
release tag plus the patches in this repository, built as the Dockerfiles here build it. Before
anyone outside the project uses a desktop, its web client links here.

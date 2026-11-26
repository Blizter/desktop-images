# Changes to Kyber

Kyber is AGPL-3.0. The image builds it from the upstream release tag
(`gitlab.com/kyber`, `KYBER_VERSION` in the Dockerfile) plus the patches here, applied with
`git apply` in the `kynput`, `kyber` and `web` stages. Nothing else of Kyber is changed.

| Patch | Applies to | What | Why |
|-------|-----------|------|-----|
| `kynput-xtest-input.patch` | `core/kynput` | Keys, mouse buttons, the wheel and relative moves go through the X server's XTEST extension when no uinput device can be created. With uinput, nothing changes | A Kata VM's kernel has no `/dev/uinput` and loads no modules: the desktop showed and the pointer moved, but nothing could be clicked or typed |
| `kyctl-seat-takeover.patch` | `core/kyctl` (kycontroller) | With `multi_client = false`, a login by the user who already holds the seat replaces that session instead of getting 409. For 15 s after that, further logins are refused as before. Another user's login is still refused; with `multi_client = true`, nothing changes | A client that loses its network (a phone changing cell, a laptop waking up) logs in again for 10 s, but its dead session keeps the seat for up to a minute, or until its token expires if it never connected: the desktop's own user was locked out (lab, 2026-11-23). The 15 s keep a second device and the first from taking the seat from each other in turns: the one that lost it gives up |
| `kyber-web-portal-login.patch` | `apps/kyber-web` (`ui.js`, `index.html`) | Once a handoff from a portal has connected, the page remembers that portal's address for this desktop; a later load without a handoff (a reload, a bookmark) goes there instead of showing Kyber's own login. The form lists OIDC only, without a popup. Where nothing is remembered, the page says to open the desktop from its portal | A reload dropped the user on Kyber's form: Basic and Token are off on the server, and its own OIDC login cannot return to a session's address (Keycloak takes no wildcard host). The portal's `/open/<session>` is the one login that works |
| `kyber-web-audio-buffer.patch` | `apps/kyber-web` (`script.js`) | The first connection buffers 200 ms of audio instead of the player's default 50; an `audio_buffer` URL parameter still wins | Sound crackled while the screen was busy (a video, an event sound with a pop-up), not with a sound file on a still screen; what reached Kyber was clean (lab, 2026-11-25). A page opened by a portal builds no sidebar, so the address was the only way to set it. Costs: sound trails the picture by about 150 ms more |
| (in the Dockerfile, `web` stage) | `apps/kyber-web` | `index.html` loads chart.js 4.5.1 (MIT) from the image instead of cdn.jsdelivr.net; the file is the same, checked by its SHA-256 | A desktop's page must work without the internet and name no third party |

## Licence

Whoever uses a desktop over the network must be offered the source of the Kyber that runs it
(AGPL section 13), and so must anyone given the image. That is upstream's tag plus these files,
published in this repository. Still to do before anyone outside the project uses a desktop: link
here from the web client.

## Updating Kyber

A patch that no longer applies fails the build at `git apply`. Rebase it on the new tag, or
drop it once upstream has the same.

# The work desktop, streamed by Kyber 0.29.0 with four patches (work/patches) (AGPL-3.0, built from its public source).
#
# Built from Kyber's own instructions: kyber-desktop's README ("Build", Linux) for the server and
# kyber-web's README for the web client. Nothing in Kyber's trees is edited: kymedia is
# configured with its documented meson options (meson_options.txt) instead of its wrapper
# script, only to leave out the client side (VLC), which a server image does not use.
#
# checkov:skip=CKV_DOCKER_2: Kubernetes ignores HEALTHCHECK; windbreak reads the pod's Ready condition
# checkov:skip=CKV_DOCKER_4: the one ADD fetches Element's signing key and checks it with --checksum
ARG KYBER_VERSION=0.29.0

# Stages: sources (toolchain + Kyber's trees), then kymedia, kynput and web in parallel (none
# reads another's output), then kyber, where kycontroller links kymedia's and kynput's.
FROM debian:trixie-slim AS sources
ARG KYBER_VERSION
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# kyber-desktop README, "Debian: Install required system packages", without `build-dep vlc` (no
# client). That build-dep also brought what the server needs: the libraries kymedia's FFmpeg
# (subprojects/packagefiles/libavconv/meson.build) and txproto (src/meson.build) look for, and the
# X11 headers the Vulkan loader needs, so they are listed here. nodejs for the web client; ccache
# for every C/C++ compile below. Downloaded packages stay in a cache mount, so a list change
# downloads only what is new: Debian's docker-clean hook, which deletes them, goes.
RUN --mount=type=cache,id=apt-sources,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lists-sources,target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl git wget unzip \
        build-essential cmake ninja-build pkg-config ccache \
        llvm-dev libclang-dev clang libssl-dev \
        autoconf libtool \
        python3 python3-setuptools python3-mako python3-venv python3-jinja2 \
        lua5.4 liblua5.4-dev \
        autopoint gettext bison flex nasm ragel help2man \
        libdrm-dev libgbm-dev glslang-dev liblcms2-dev libpulse-dev \
        libxcb-xkb-dev libxkbcommon-dev libxcb-xtest0-dev \
        libxcb-render0-dev libxcb-shape0-dev libxcb-xfixes0-dev \
        libwayland-dev wayland-protocols libvulkan-dev \
        libevdev-dev libudev-dev libinput-dev \
        libv4l-dev libva-dev libvdpau-dev libasound2-dev libcap-dev libedit-dev \
        libx11-dev libx11-xcb-dev libxrandr-dev libxcb1-dev libxcb-shm0-dev libxcb-randr0-dev \
        libegl-dev libgl-dev libgles-dev \
        nodejs npm

# Pinned as both READMEs say: meson 1.10.0 (newer than trixie's), Rust 1.89.0, cargo-c,
# wasm-bindgen and wasm-opt; pnpm through corepack, at the version kyber-web's package.json names.
ENV CARGO_HOME=/opt/cargo RUSTUP_HOME=/opt/rustup UV_TOOL_BIN_DIR=/usr/local/bin
ENV PATH=/opt/cargo/bin:$PATH
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh \
    && uv tool install meson==1.10.0 --with jinja2 \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain 1.89.0 \
    && rustup target add wasm32-unknown-unknown \
    && npm install -g corepack@0.34.0 && corepack enable pnpm

# cargo-c, wasm-bindgen and wasm-opt from their release binaries, at the pinned versions (wasm-opt
# 0.116.1 wraps Binaryen 116): `cargo install` compiled them, Binaryen's C++ above all, for 13 min.
# cargo-c publishes no checksum: its hash is the tarball's as downloaded on 2026-11-21.
RUN gh=https://github.com \
    && curl -fsSLo /tmp/cargo-c.tgz "$gh/lu-zero/cargo-c/releases/download/v0.10.15/cargo-c-x86_64-unknown-linux-musl.tar.gz" \
    && curl -fsSLo /tmp/wasm-bindgen.tgz "$gh/wasm-bindgen/wasm-bindgen/releases/download/0.2.100/wasm-bindgen-0.2.100-x86_64-unknown-linux-musl.tar.gz" \
    && curl -fsSLo /tmp/binaryen.tgz "$gh/WebAssembly/binaryen/releases/download/version_116/binaryen-version_116-x86_64-linux.tar.gz" \
    && printf '%s  %s\n' \
        066ff231fffa7c5f22ede897dd968110eddee6f16eff6eaf9415231efce57dbb /tmp/cargo-c.tgz \
        63d6a38deb65bd7023c02bdf382ab66b0d2c0241c8582fd3413b5a808b8aeb5b /tmp/wasm-bindgen.tgz \
        c55b74f3109cdae97490faf089b0286d3bba926bb6ea5ed00c8c784fc53718fd /tmp/binaryen.tgz \
        | sha256sum -c - \
    && tar -xzf /tmp/cargo-c.tgz -C /opt/cargo/bin \
    && tar -xzf /tmp/wasm-bindgen.tgz -C /opt/cargo/bin --strip-components=1 --wildcards '*/wasm-bindgen*' '*/wasm2es6js' \
    && tar -xzf /tmp/binaryen.tgz -C /usr/local --strip-components=1 binaryen-version_116/bin/wasm-opt \
    && rm /tmp/*.tgz \
    && cargo cbuild --version && wasm-bindgen --version && wasm-opt --version

# Sources at the release tag. VLC and its Android binding are client-only: their submodules
# are left out, everything else is fetched as pinned.
WORKDIR /src
RUN for repo in core/kysdk apps/kyber-web; do \
        git clone --quiet --depth 1 --branch "$KYBER_VERSION" "https://gitlab.com/kyber/$repo.git"; \
    done \
    && for tree in kysdk kyber-web; do \
        git -C "$tree" \
            -c submodule.subprojects/vlc.update=none -c submodule.subprojects/libvlcjni.update=none \
            submodule update --init --recursive --depth 1 --jobs 8; \
    done

ENV KYBER=/opt/kyber
ENV PKG_CONFIG_PATH=$KYBER/lib/pkgconfig:$KYBER/lib/x86_64-linux-gnu/pkgconfig:$KYBER/lib64/pkgconfig \
    LD_LIBRARY_PATH=$KYBER/lib:$KYBER/lib/x86_64-linux-gnu:$KYBER/lib64

# ccache: meson puts it in front of the compiler it hands FFmpeg's configure (libavconv's --cc),
# and /usr/lib/ccache's symlinks catch the other C compiles (SDL2, cc crates). The cache lives in
# a cache mount, one per stage (kymedia keeps id ccache, which it filled; ccache-kynput and
# ccache-kyber): kymedia and kynput sharing one in parallel lost it (2026-11-21). Alone, a Kyber
# bump hit 89.5% and kymedia took 186 s instead of 383 s.
# So a Kyber bump recompiles only what changed. COMPILERCHECK=content:
# a rebuilt apt layer with the same gcc still hits. Cargo's registry and each project's target/
# are cache mounts too, at the paths Kyber's scripts expect, one registry per stage: cargo's lock
# lives in CARGO_HOME, outside the mount, so parallel stages sharing one raced ("File exists").
ENV PATH=/usr/lib/ccache:$PATH CCACHE_DIR=/ccache CCACHE_MAXSIZE=10G CCACHE_BASEDIR=/src \
    CCACHE_COMPILERCHECK=content

# kymedia (FFmpeg, x264, opus, txproto, the watermark's Vulkan stack, kyavserver): the steps of
# its build-linux.sh, with the client off. The long branch.
FROM sources AS kymedia
WORKDIR /src/kysdk/kymedia
RUN --mount=type=cache,id=ccache,target=/ccache \
    --mount=type=cache,id=cargo-registry-kymedia,target=/opt/cargo/registry \
    --mount=type=cache,id=cargo-git-kymedia,target=/opt/cargo/git \
    --mount=type=cache,id=target-kymedia,target=/src/kysdk/kymedia/target \
    --mount=type=cache,id=meson-packagecache,target=/src/kysdk/kymedia/subprojects/packagecache \
    ./build-kyaudioreg.sh -p linux -o "$KYBER" \
    && cp -a subprojects/packagefiles/libavconv/. subprojects/libavconv/ \
    && PKG_CONFIG_LIBDIR="$PKG_CONFIG_PATH:$(pkg-config --variable pc_path pkg-config)" \
        meson setup build --prefix "$KYBER" --buildtype=release --wrap-mode=forcefallback \
            -Dbuild_server=enabled -Dbuild_client=disabled \
    && meson compile -C build \
    && meson install -C build
RUN --mount=type=cache,id=ccache,target=/ccache \
    --mount=type=cache,id=cargo-registry-kymedia,target=/opt/cargo/registry \
    --mount=type=cache,id=cargo-git-kymedia,target=/opt/cargo/git \
    --mount=type=cache,id=target-kymedia,target=/src/kysdk/kymedia/target \
    AVCONV_INCLUDE_DIR=$KYBER/include AVCONV_LIB_DIR=$KYBER/lib cargo build -p kyavserver --release \
    && install -D target/release/kyavserver "$KYBER/bin/kyavserver"

# kynput (kynputserver), its own script as it is: it builds its own SDL2 and reads nothing of
# kymedia's, so it runs alongside.
FROM sources AS kynput
WORKDIR /src/kysdk/kynput
# Our one change to Kyber (patches/README.md): keys and buttons through XTEST where there is no
# /dev/uinput, as in a Kata VM. Here and in the kyber stage, not in sources: kymedia and the web
# client keep their cached layers.
COPY work/patches/kynput-xtest-input.patch /tmp/
RUN git apply /tmp/kynput-xtest-input.patch
RUN --mount=type=cache,id=ccache-kynput,target=/ccache \
    --mount=type=cache,id=cargo-registry-kynput,target=/opt/cargo/registry \
    --mount=type=cache,id=cargo-git-kynput,target=/opt/cargo/git \
    --mount=type=cache,id=target-kynput,target=/src/kysdk/kynput/target \
    ./build-linux.sh -o "$KYBER"

# The web client (wasm and pnpm, nothing from $KYBER), alongside too.
FROM sources AS web
WORKDIR /src/kyber-web
# Our changes to the web client (patches/README.md): without a handoff, back to the portal; 200 ms
# of audio buffered. Before the build: it bundles ui.js and script.js.
COPY work/patches/kyber-web-portal-login.patch work/patches/kyber-web-audio-buffer.patch /tmp/
RUN git apply /tmp/kyber-web-portal-login.patch /tmp/kyber-web-audio-buffer.patch
RUN --mount=type=cache,id=cargo-registry-web,target=/opt/cargo/registry \
    --mount=type=cache,id=cargo-git-web,target=/opt/cargo/git \
    --mount=type=cache,id=target-web,target=/src/kyber-web/target \
    --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=corepack,target=/root/.cache/node/corepack \
    ./build-wasm.sh
# The page loads chart.js (its statistics graphs) from a public CDN: a desktop's page shouldn't
# need the internet, nor tell a third party who opens one. Serve the same file, checked, from
# the image (patches/README.md). A new Kyber naming another version fails here.
RUN url=https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js \
    && grep -q "src=\"$url\"" html/index.html \
    && curl -fsSLo html/chart.umd.min.js "$url" \
    && echo "48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a  html/chart.umd.min.js" > /tmp/chart.sha256 \
    && sha256sum -c /tmp/chart.sha256 \
    && sed -i "s|src=\"$url\"|src=\"./chart.umd.min.js\"|" html/index.html

# kycontroller patches in kymedia's and kynput's crates and links what they installed: it waits
# for both. It serves the web client from $KYBER/webclient.
FROM sources AS kyber
COPY --from=kymedia $KYBER $KYBER
COPY --from=kynput $KYBER $KYBER
# kycontroller compiles kynput's crates from this stage's copy of the sources.
COPY work/patches/kynput-xtest-input.patch /tmp/
RUN git -C /src/kysdk/kynput apply /tmp/kynput-xtest-input.patch
# Our change to kycontroller (patches/README.md): a user takes over their own seat.
COPY work/patches/kyctl-seat-takeover.patch /tmp/
RUN git -C /src/kysdk/kyctl apply /tmp/kyctl-seat-takeover.patch
WORKDIR /src/kysdk/kyctl
RUN --mount=type=cache,id=ccache-kyber,target=/ccache \
    --mount=type=cache,id=cargo-registry-kyber,target=/opt/cargo/registry \
    --mount=type=cache,id=cargo-git-kyber,target=/opt/cargo/git \
    --mount=type=cache,id=target-kyctl,target=/src/kysdk/kyctl/target \
    ./build-linux.sh -s -o "$KYBER" build-kycontroller
COPY --from=web /src/kyber-web/html $KYBER/webclient

# Only what runs: binaries, the libraries Kyber built, the web client.
RUN rm -rf "$KYBER/include" "$KYBER/share/doc" "$KYBER/lib/pkgconfig" "$KYBER/lib/x86_64-linux-gnu/pkgconfig" \
    && find "$KYBER/lib" -name '*.a' -delete


FROM debian:trixie-slim AS desktop
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# The desktop (KDE Plasma on Xorg's dummy driver, drawn by Mesa's software renderer: there is no
# GPU), its apps, sound, and what Kyber's binaries link against. Xorg rather than Xvfb: Xvfb's screen modes carry no timings, and Kyber's capture
# reads a refresh rate from them. Package downloads cached like the sources stage's, own ids.
# The CA bundle first: Element's repository (element-desktop, not packaged by Debian) is HTTPS.
RUN --mount=type=cache,id=apt-desktop,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lists-desktop,target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update && apt-get install -y --no-install-recommends ca-certificates
COPY work/apt/element-io.sources /etc/apt/sources.list.d/
ADD --chmod=644 --checksum=sha256:c2cb0c6bf269c56158e3c0ae8185cbeee168db5071bef659b97b1a775ebc1955 \
    https://packages.element.io/debian/element-io-archive-keyring.gpg /usr/share/keyrings/
RUN --mount=type=cache,id=apt-desktop,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lists-desktop,target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update && apt-get install -y --no-install-recommends \
        tini ca-certificates openssl locales \
        xserver-xorg-core xserver-xorg-video-dummy xserver-xorg-input-libinput x11-xserver-utils x11-xkb-utils xprintidle \
        dbus dbus-x11 \
        plasma-desktop plasma-workspace kwin-x11 kglobalacceld plasma-pa breeze breeze-icon-theme libgl1-mesa-dri \
        dolphin konsole kwrite kwalletmanager \
        adwaita-icon-theme fonts-dejavu \
        firefox-esr libreoffice-writer libreoffice-calc libreoffice-impress libreoffice-gtk3 vlc \
        nextcloud-desktop dolphin-nextcloud element-desktop \
        pulseaudio pulseaudio-utils libcanberra-pulse libnss-extrausers \
        libdrm2 libgbm1 liblcms2-2 libpulse0 libxkbcommon0 libwayland-client0 libvulkan1 \
        libxcb1 libxcb-shm0 libxcb-xkb1 libxcb-xtest0 libxcb-render0 libxcb-shape0 libxcb-xfixes0 libxcb-randr0 \
        libssl3t64 libevdev2 libudev1 libinput10 liblua5.4-0 libasound2t64 \
        libcap2 libedit2 libx11-6 libx11-xcb1 libxrandr2 libwayland-cursor0 \
        libva2 libva-drm2 libva-x11-2 libvdpau1 libegl1 libgl1 libopengl0 libgles2 libv4l-0t64 \
    && sed -i 's/^# *en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen \
    && sed -i -E 's|^(Exec=\S*element-desktop)|\1 --no-sandbox --config /etc/element-desktop/config.json|' /usr/share/applications/element-desktop.desktop \
    && grep -q -- '--no-sandbox --config /etc/element-desktop/config.json' /usr/share/applications/element-desktop.desktop \
    && dbus-uuidgen --ensure

COPY --from=kyber /opt/kyber /opt/kyber
ENV PATH=/opt/kyber/bin:$PATH \
    LD_LIBRARY_PATH=/opt/kyber/lib:/opt/kyber/lib/x86_64-linux-gnu:/opt/kyber/lib64

# Fails the build if a Kyber binary needs a library this stage lacks.
RUN missing=$(ldd /opt/kyber/bin/* 2>/dev/null | grep 'not found' || true); \
    if [ -n "$missing" ]; then echo "$missing" >&2; exit 1; fi

# The desktop contract: uid 1000, HOME /home/user, a read-only root. The X server compiles
# keymaps into /var/lib/xkb at run time, so that points into /tmp.
# uid 1000 is named after its user from windbreak's account files (/run/windbreak/identity,
# read first through libnss-extrausers): the desktop shows the person, not "user", which stays in
# /etc/passwd for when they are missing.
RUN useradd --create-home --home-dir /home/user --uid 1000 --user-group --shell /bin/bash user \
    && rm -rf /var/lib/xkb && ln -s /tmp/xkb /var/lib/xkb \
    && sed -i -E 's/^(passwd|group):([[:space:]]+)files/\1:\2extrausers files/' /etc/nsswitch.conf \
    && grep -q '^passwd:.*extrausers files' /etc/nsswitch.conf \
    && rmdir /var/lib/extrausers && ln -s /run/windbreak/identity /var/lib/extrausers

COPY --chmod=755 work/start-desktop work/session-agent work/windbreak-keyring work/windbreak-session-end /usr/local/bin/
# Plasma's defaults for a desktop with no password, no seat and no GPU (see the files).
COPY work/xdg/ /etc/xdg/
COPY work/plasma/windbreak-pin-apps.js /usr/share/plasma/shells/org.kde.plasma.desktop/contents/updates/
# Element starts on the lab's Matrix server (no server to pick, no end-to-end encryption to set
# up, no analytics, crash or debug-log reports, integration manager or map server, all Element's or
# third parties' on the internet: the Exec line above passes this file). Firefox hands Element's sign-in back to it without
# asking which application should open the link, and skips what a desktop with no internet has
# no use for: updates, telemetry, studies, captive-portal and DNS-over-HTTPS checks, first-run,
# onboarding and what's-new pages, sponsored tiles.
COPY work/element/config.json /etc/element-desktop/
COPY work/firefox/policies.json /usr/lib/firefox-esr/distribution/

# SHELL: Konsole starts $SHELL, and warns when it is unset.
ENV HOME=/home/user SHELL=/bin/bash DISPLAY=:0 LANG=en_US.UTF-8 KYBER_CONFIG=/tmp/kyber/kyber_config.toml
USER 1000:1000
WORKDIR /home/user
EXPOSE 8443/tcp 8443/udp
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/start-desktop"]

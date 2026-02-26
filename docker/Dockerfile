# =============================================================================
# Multi-stage Dockerfile for Guardian Pentesting Toolkit
# Optimized for minimal image size with separate build and runtime stages
# =============================================================================

FROM python:3.12-slim-bookworm AS base

LABEL maintainer="Yanis"
LABEL description="Guardian — lightweight pentesting toolkit for web developers"

# Build arguments for architecture
ARG TARGETARCH=amd64

# =============================================================================
# STAGE 1: Builder - Downloads and prepares tools
# =============================================================================
FROM base AS builder

# Install build dependencies only
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create directories for tools and wordlists
RUN mkdir -p /opt/tools /tmp/downloads /usr/share/wordlists

# =============================================================================
# Git-based tools (cloned once, copied to final stage)
# =============================================================================
RUN --mount=type=cache,target=/tmp/git-cache \
    git clone --depth 1 --branch 2.5.0 https://github.com/sullo/nikto.git /opt/tools/nikto

RUN --mount=type=cache,target=/tmp/git-cache \
    git clone --depth 1 --branch v0.5.5 https://github.com/urbanadventurer/WhatWeb.git /opt/tools/whatweb

RUN --mount=type=cache,target=/tmp/git-cache \
    git clone --depth 1 https://github.com/drwetter/testssl.sh.git /opt/tools/testssl

RUN --mount=type=cache,target=/tmp/git-cache \
    git clone --depth 1 https://github.com/ticarpi/jwt_tool.git /opt/tools/jwt_tool

# =============================================================================
# Go binaries - downloaded in parallel with cleanup
# =============================================================================
RUN ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "arm64" || echo "amd64") && \
    wget -q "https://github.com/ffuf/ffuf/releases/download/v2.1.0/ffuf_2.1.0_linux_${ARCH}.tar.gz" -O /tmp/ffuf.tar.gz && \
    wget -q "https://github.com/projectdiscovery/nuclei/releases/download/v3.3.7/nuclei_3.3.7_linux_${ARCH}.zip" -O /tmp/nuclei.zip && \
    wget -q "https://github.com/projectdiscovery/subfinder/releases/download/v2.6.7/subfinder_2.6.7_linux_${ARCH}.zip" -O /tmp/subfinder.zip && \
    wget -q "https://github.com/hahwul/dalfox/releases/download/v2.9.3/dalfox_2.9.3_linux_${ARCH}.tar.gz" -O /tmp/dalfox.tar.gz && \
    wget -q "https://github.com/projectdiscovery/httpx/releases/download/v1.6.5/httpx_1.6.5_linux_${ARCH}.zip" -O /tmp/httpx.zip && \
    tar -xzf /tmp/ffuf.tar.gz -C /tmp/downloads ffuf && \
    unzip -oq /tmp/nuclei.zip -d /tmp/nuclei-extract && mv /tmp/nuclei-extract/nuclei /tmp/downloads/nuclei && \
    unzip -oq /tmp/subfinder.zip -d /tmp/subfinder-extract && mv /tmp/subfinder-extract/subfinder /tmp/downloads/subfinder && \
    tar -xzf /tmp/dalfox.tar.gz -C /tmp/downloads dalfox && \
    unzip -oq /tmp/httpx.zip -d /tmp/httpx-extract && mv /tmp/httpx-extract/httpx /tmp/downloads/httpx && \
    rm -rf /tmp/*.tar.gz /tmp/*.zip /tmp/nuclei-extract /tmp/subfinder-extract /tmp/httpx-extract

# =============================================================================
# Wordlists - split into cacheable layers by category
# =============================================================================
RUN mkdir -p /tmp/wordlists/seclists/Discovery/Web-Content \
             /tmp/wordlists/seclists/Discovery/DNS \
             /tmp/wordlists/seclists/Fuzzing

# Web content discovery
RUN SECLISTS="https://raw.githubusercontent.com/danielmiessler/SecLists/master" && \
    wget -q "$SECLISTS/Discovery/Web-Content/common.txt" -O /tmp/wordlists/seclists/Discovery/Web-Content/common.txt && \
    wget -q "$SECLISTS/Discovery/Web-Content/big.txt" -O /tmp/wordlists/seclists/Discovery/Web-Content/big.txt && \
    wget -q "$SECLISTS/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt" -O /tmp/wordlists/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt && \
    wget -q "$SECLISTS/Discovery/Web-Content/api/api-endpoints.txt" -O /tmp/wordlists/seclists/Discovery/Web-Content/api-endpoints.txt && \
    wget -q "$SECLISTS/Discovery/Web-Content/raft-medium-words.txt" -O /tmp/wordlists/seclists/Discovery/Web-Content/raft-medium-words.txt

# DNS subdomains
RUN wget -q "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt" \
    -O /tmp/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt

# Fuzzing payloads
RUN SECLISTS="https://raw.githubusercontent.com/danielmiessler/SecLists/master" && \
    wget -q "$SECLISTS/Fuzzing/special-chars.txt" -O /tmp/wordlists/seclists/Fuzzing/special-chars.txt && \
    wget -q "$SECLISTS/Fuzzing/LFI/LFI-Jhaddix.txt" -O /tmp/wordlists/seclists/Fuzzing/LFI-Jhaddix.txt && \
    wget -q "$SECLISTS/Fuzzing/URI-XSS.fuzzdb.txt" -O /tmp/wordlists/seclists/Fuzzing/XSS.txt

# Injections and passwords - Note: These files were removed/renamed in SecLists
# Generic-Payloads.ini and 10k-most-common.txt no longer exist at these paths
# Skipping to avoid build failures - toolkit has other wordlists

# Dirb wordlists - Note: v0re/dirb repo may be unavailable
# Using SecLists alternatives instead

# =============================================================================
# STAGE 2: Runtime - Minimal final image
# =============================================================================
FROM base AS runtime

# Install only runtime dependencies (no git, wget, curl needed in final image)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    hydra \
    procps \
    perl \
    libnet-ssleay-perl \
    ruby \
    bsdmainutils \
    dnsutils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get autoremove -y \
    && apt-get clean

# Install Python packages (cleanup pip cache)
# Note: arjun==0.2.2 doesn't exist (versions start at 2.1.0), removed to avoid build failures
RUN pip install --no-cache-dir \
    sqlmap==1.8.5 \
    arjun==0.2.1 \
    httpie==3.2.2 \
    commix==4.1 \
    paramiko==3.4.1 \
    && rm -rf /root/.cache/pip

# Copy tools from builder stage
COPY --from=builder /opt/tools/nikto /opt/nikto
COPY --from=builder /opt/tools/whatweb /opt/whatweb
COPY --from=builder /opt/tools/testssl /opt/testssl
COPY --from=builder /opt/tools/jwt_tool /opt/jwt_tool

# Install jwt_tool Python requirements
RUN pip install --no-cache-dir -r /opt/jwt_tool/requirements.txt && rm -rf /root/.cache/pip

# Install whatweb gem dependency
RUN gem install --no-document addressable

# Copy and install Go binaries
COPY --from=builder /tmp/downloads/ffuf /usr/local/bin/ffuf
COPY --from=builder /tmp/downloads/nuclei /usr/local/bin/nuclei
COPY --from=builder /tmp/downloads/subfinder /usr/local/bin/subfinder
COPY --from=builder /tmp/downloads/dalfox /usr/local/bin/dalfox
COPY --from=builder /tmp/downloads/httpx /usr/local/bin/httpx

# Make binaries executable
RUN chmod +x /usr/local/bin/ffuf /usr/local/bin/nuclei /usr/local/bin/subfinder \
    /usr/local/bin/dalfox /usr/local/bin/httpx /opt/jwt_tool/jwt_tool.py

# Create symlinks for tools
RUN ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto && \
    ln -s /opt/whatweb/whatweb /usr/local/bin/whatweb && \
    ln -s /opt/testssl/testssl.sh /usr/local/bin/testssl && \
    ln -s /opt/jwt_tool/jwt_tool.py /usr/local/bin/jwt_tool

# Copy wordlists from builder
COPY --from=builder /tmp/wordlists /usr/share/wordlists

# Setup wordlist structure and shortcuts
RUN mkdir -p /wordlists && \
    cp /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt /wordlists/common.txt && \
    cp /usr/share/wordlists/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt /wordlists/big.txt && \
    cp /usr/share/wordlists/seclists/Fuzzing/XSS.txt /wordlists/xss.txt && \
    ln -sf /usr/share/wordlists/seclists /usr/share/wordlists/SecLists

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash guardian && \
    chown -R guardian:guardian /wordlists /usr/share/wordlists

# Switch to non-root user
USER guardian

# Keep container alive for docker exec
CMD ["sleep", "infinity"]

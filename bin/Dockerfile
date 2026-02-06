FROM python:3.12-slim-bookworm

LABEL maintainer="Yanis"
LABEL description="Guardian — lightweight pentesting toolkit for web developers"

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    hydra \
    curl \
    wget \
    git \
    unzip \
    procps \
    perl \
    libnet-ssleay-perl \
    ruby \
    bsdmainutils \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

# nikto (Perl-based web server scanner)
RUN git clone --depth 1 --branch 2.5.0 https://github.com/sullo/nikto.git /opt/nikto && \
    ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto

# whatweb (Ruby-based tech fingerprinting)
RUN git clone --depth 1 https://github.com/urbanadventurer/WhatWeb.git /opt/whatweb && \
    gem install --no-document addressable && \
    ln -s /opt/whatweb/whatweb /usr/local/bin/whatweb

# Python tools - install without strict version pins for compatibility
RUN pip install --no-cache-dir \
    sqlmap \
    httpie \
    paramiko

# testssl.sh
RUN git clone --depth 1 https://github.com/drwetter/testssl.sh.git /opt/testssl && \
    ln -s /opt/testssl/testssl.sh /usr/local/bin/testssl

# jwt_tool
RUN git clone --depth 1 https://github.com/ticarpi/jwt_tool.git /opt/jwt_tool && \
    pip install --no-cache-dir -r /opt/jwt_tool/requirements.txt && \
    chmod +x /opt/jwt_tool/jwt_tool.py && \
    ln -s /opt/jwt_tool/jwt_tool.py /usr/local/bin/jwt_tool

# Go binaries (pre-built from GitHub releases)
ARG TARGETARCH=amd64
RUN ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "arm64" || echo "amd64") && \
    # ffuf
    wget -q "https://github.com/ffuf/ffuf/releases/download/v2.1.0/ffuf_2.1.0_linux_${ARCH}.tar.gz" -O /tmp/ffuf.tar.gz && \
    tar -xzf /tmp/ffuf.tar.gz -C /usr/local/bin ffuf && \
    # nuclei
    wget -q "https://github.com/projectdiscovery/nuclei/releases/download/v3.3.7/nuclei_3.3.7_linux_${ARCH}.zip" -O /tmp/nuclei.zip && \
    unzip -oq /tmp/nuclei.zip -d /tmp/nuclei-extract && mv /tmp/nuclei-extract/nuclei /usr/local/bin/nuclei && \
    # subfinder
    wget -q "https://github.com/projectdiscovery/subfinder/releases/download/v2.6.7/subfinder_2.6.7_linux_${ARCH}.zip" -O /tmp/subfinder.zip && \
    unzip -oq /tmp/subfinder.zip -d /tmp/subfinder-extract && mv /tmp/subfinder-extract/subfinder /usr/local/bin/subfinder && \
    # dalfox
    wget -q "https://github.com/hahwul/dalfox/releases/download/v2.9.3/dalfox_2.9.3_linux_${ARCH}.tar.gz" -O /tmp/dalfox.tar.gz && \
    tar -xzf /tmp/dalfox.tar.gz -C /usr/local/bin dalfox && \
    # httpx
    wget -q "https://github.com/projectdiscovery/httpx/releases/download/v1.6.5/httpx_1.6.5_linux_${ARCH}.zip" -O /tmp/httpx.zip && \
    unzip -oq /tmp/httpx.zip -d /tmp/httpx-extract && mv /tmp/httpx-extract/httpx /usr/local/bin/httpx && \
    # cleanup
    rm -rf /tmp/*

# Make all binaries executable
RUN chmod +x /usr/local/bin/ffuf /usr/local/bin/nuclei /usr/local/bin/subfinder /usr/local/bin/dalfox /usr/local/bin/httpx

# Wordlists — essential files only
# NOTE: Using --show-progress for better error visibility if download fails
RUN mkdir -p /usr/share/wordlists/seclists/Discovery/Web-Content \
             /usr/share/wordlists/seclists/Discovery/DNS \
             /usr/share/wordlists/seclists/Fuzzing/Databases/SQLi \
             /usr/share/wordlists/seclists/Passwords \
             /usr/share/wordlists/dirb \
             /wordlists && \
    SECLISTS="https://raw.githubusercontent.com/danielmiessler/SecLists/master" && \
    # Web content discovery
    wget --no-verbose "$SECLISTS/Discovery/Web-Content/common.txt" -O /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt && \
    wget --no-verbose "$SECLISTS/Discovery/Web-Content/big.txt" -O /usr/share/wordlists/seclists/Discovery/Web-Content/big.txt && \
    wget --no-verbose "$SECLISTS/Discovery/Web-Content/raft-medium-words.txt" -O /usr/share/wordlists/seclists/Discovery/Web-Content/raft-medium-words.txt && \
    # DNS
    wget --no-verbose "$SECLISTS/Discovery/DNS/subdomains-top1million-5000.txt" -O /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt && \
    # Fuzzing - special chars
    wget --no-verbose "$SECLISTS/Fuzzing/special-chars.txt" -O /usr/share/wordlists/seclists/Fuzzing/special-chars.txt && \
    # Fuzzing - LFI (Local File Inclusion)
    wget --no-verbose "$SECLISTS/Fuzzing/LFI/LFI-Jhaddix.txt" -O /usr/share/wordlists/seclists/Fuzzing/LFI-Jhaddix.txt && \
    # Fuzzing - XSS payloads
    wget --no-verbose "$SECLISTS/Fuzzing/URI-XSS.fuzzdb.txt" -O /usr/share/wordlists/seclists/Fuzzing/XSS.txt && \
    # Fuzzing - SQL injection payloads (replaces non-existent Generic-Payloads.ini)
    wget --no-verbose "$SECLISTS/Fuzzing/Databases/SQLi/Generic-SQLi.txt" -O /usr/share/wordlists/seclists/Fuzzing/Databases/SQLi/Generic-SQLi.txt && \
    # Passwords
    wget --no-verbose "$SECLISTS/Passwords/Common-Credentials/10k-most-common.txt" -O /usr/share/wordlists/seclists/Passwords/top-10000.txt && \
    # dirb wordlists
    wget --no-verbose "https://raw.githubusercontent.com/v0re/dirb/master/wordlists/common.txt" -O /usr/share/wordlists/dirb/common.txt && \
    wget --no-verbose "https://raw.githubusercontent.com/v0re/dirb/master/wordlists/big.txt" -O /usr/share/wordlists/dirb/big.txt && \
    # Copy to /wordlists for easy access (avoids path issues on Windows/Git Bash)
    cp /usr/share/wordlists/dirb/common.txt /wordlists/common.txt && \
    cp /usr/share/wordlists/dirb/big.txt /wordlists/big.txt && \
    cp /usr/share/wordlists/seclists/Fuzzing/XSS.txt /wordlists/xss.txt && \
    cp /usr/share/wordlists/seclists/Passwords/top-10000.txt /wordlists/passwords.txt && \
    cp /usr/share/wordlists/seclists/Fuzzing/Databases/SQLi/Generic-SQLi.txt /wordlists/sqli.txt && \
    # Create compatibility symlinks
    ln -sf /usr/share/wordlists/seclists /usr/share/wordlists/SecLists

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash guardian && \
    chown -R guardian:guardian /wordlists /usr/share/wordlists

# Switch to non-root user
USER guardian

# Keep container alive for docker exec
CMD ["sleep", "infinity"]

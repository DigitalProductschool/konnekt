#!/bin/sh
# Writes who may reach /api/connect/ (research R13). The nginx image's entrypoint
# runs this from /docker-entrypoint.d/ at every container start, before nginx starts.
#
# SERVICEBW_ALLOWED_CIDRS  Comma-separated addresses or ranges (CIDR) that may call
#                          the connection URLs. Empty or unset closes /api/connect/:
#                          nginx answers 403 to everyone.
# TRUSTED_PROXY_CIDRS      Comma-separated ranges of the proxy in front of nginx.
#                          Only requests from these may give the client's address
#                          in X-Forwarded-For. Empty or unset: the connecting
#                          address counts.
#
# An entry with anything but hex digits, '.', ':' and '/' stops the container, so a
# value can't add other nginx directives. nginx itself rejects an invalid address.
set -eu
# The lists are split on commas and spaces below, without filename expansion
set -f

ALLOW_CONF=/etc/nginx/servicebw-allow.conf
REAL_IP_CONF=/etc/nginx/real-ip.conf

check_entry() {
    case "$2" in
        *[!0-9A-Fa-f.:/]*)
            echo "$0: $1 has an invalid entry: '$2'" >&2
            exit 1
            ;;
    esac
}

IFS=', '

allowed=0
{
    for cidr in ${SERVICEBW_ALLOWED_CIDRS:-}; do
        [ -n "$cidr" ] || continue
        check_entry SERVICEBW_ALLOWED_CIDRS "$cidr"
        echo "allow $cidr;"
        allowed=$((allowed + 1))
    done
    echo 'deny all;'
} > "$ALLOW_CONF"

trusted=0
{
    for cidr in ${TRUSTED_PROXY_CIDRS:-}; do
        [ -n "$cidr" ] || continue
        check_entry TRUSTED_PROXY_CIDRS "$cidr"
        echo "set_real_ip_from $cidr;"
        trusted=$((trusted + 1))
    done
    if [ "$trusted" -gt 0 ]; then
        echo 'real_ip_header X-Forwarded-For;'
        echo 'real_ip_recursive on;'
    fi
} > "$REAL_IP_CONF"

if [ "$allowed" -eq 0 ]; then
    echo "$0: /api/connect/ is closed: SERVICEBW_ALLOWED_CIDRS is empty"
else
    echo "$0: /api/connect/ is open to $allowed address range(s)"
fi
if [ "$trusted" -eq 0 ]; then
    echo "$0: X-Forwarded-For is ignored: TRUSTED_PROXY_CIDRS is empty"
else
    echo "$0: X-Forwarded-For is trusted from $trusted proxy range(s)"
fi

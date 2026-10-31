#!/usr/bin/env bash
# 部署 www/ 到 Home Assistant（HAOS）。
# Deploy www/ to Home Assistant (HAOS).
#
# 用法 / usage:  ./deploy.sh <ssh-host> [dest-dir]
# <ssh-host> = 你 Home Assistant 的 SSH 連線名（見自己的 ~/.ssh/config）。
# <ssh-host> = the SSH host/alias of your Home Assistant (from your ~/.ssh/config).
#
# HAOS 的 SSH add-on 沒有 rsync，故用 tar 經 ssh 傳送。
# 只覆寫 repo 內的檔案，不會刪除目標目錄內其他檔案。
# The HAOS SSH add-on has no rsync, so stream a tarball over ssh.
# Only files from this repo are overwritten; nothing else in dest-dir is removed.
set -euo pipefail

HOST="${1:?Usage: ./deploy.sh <ssh-host-of-home-assistant> [dest-dir]}"
DEST="${2:-/config/www/hkcalendar}"
SRC="$(cd "$(dirname "$0")" && pwd)/www"

echo ">> 部署到 ${HOST}:${DEST}"
tar -C "$SRC" -czf - . | ssh "$HOST" "mkdir -p '${DEST}' && tar -C '${DEST}' -xzf -"

echo ">> 完成。Lovelace 資源網址 / Done. Lovelace resource URL:"
echo "   /local/${DEST#/config/www/}/chinese-calendar-card.js"

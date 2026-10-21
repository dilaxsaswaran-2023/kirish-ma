#!/usr/bin/env python3
"""Update VM-only connection files; does not install, start or change any broker."""
import datetime
import json
import os
from pathlib import Path
import shutil

def main():
    root = Path('/opt/kirish-ma')
    if Path.cwd().resolve() != root or os.geteuid() != 0:
        raise SystemExit('Run as root from /opt/kirish-ma.')
    os.umask(0o077)
    env_path = root / '.env.production'
    connection_path = Path('/opt/kirish-ma-private/mqtt-connection-private.json')
    backup = Path('/opt/backups')
    backup.mkdir(mode=0o700, exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    shutil.copy2(env_path, backup / ('kirish-env-before-sathurix-' + stamp))
    updates = {'MQTT_BROKER_URL': 'ssl://mqtt.sathurix.com:8883', 'MQTT_USERNAME': '', 'MQTT_PASSWORD': '',
        'MQTT_ALLOW_ANONYMOUS': 'true', 'MQTT_REQUIRE_TLS': 'true', 'MQTT_CLIENT_ID': 'kirish-backend-vm', 'MQTT_TOPIC_PREFIX': 'kirish'}
    lines = [line for line in env_path.read_text().splitlines()
        if line.split('=', 1)[0] not in updates and not line.startswith(('MQTT_BACKEND_USERNAME=', 'MQTT_BACKEND_PASSWORD='))]
    env_path.write_text('\n'.join(lines + [key + '=' + value for key, value in updates.items()]) + '\n')
    env_path.chmod(0o600)
    if connection_path.exists():
        shutil.copy2(connection_path, backup / ('kirish-mqtt-connection-before-sathurix-' + stamp + '.json'))
        connection = json.loads(connection_path.read_text())
        connection.update({'host': 'mqtt.sathurix.com', 'port': 8883, 'tls': True, 'username': '', 'password': '',
            'caFile': None, 'brokerAccess': 'anonymous'})
        connection_path.write_text(json.dumps(connection, indent=2) + '\n')
        connection_path.chmod(0o600)
    print('Configured Sathurix TLS broker with explicit anonymous access. Device IDs/tokens and database are unchanged.')
    print('WARNING: physical controllers require authenticated, device-scoped broker access before production use.')

if __name__ == '__main__':
    main()

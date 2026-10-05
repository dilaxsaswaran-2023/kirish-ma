#!/usr/bin/env python3
"""Run on the VM, from /opt/kirish-ma. Generates ignored broker secrets and a safe test device."""
import datetime
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import urllib.request

ROOT = Path('/opt/kirish-ma')
PRIVATE = Path('/opt/kirish-ma-private')
RUNTIME = ROOT / 'deploy/mqtt/runtime'
IMAGE = 'eclipse-mosquitto:2.0.22'
HOST = '45.67.221.203'
API = 'http://127.0.0.1:5030'

def command(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)

def main():
    if Path.cwd().resolve() != ROOT or os.geteuid() != 0:
        raise SystemExit('Run as root from /opt/kirish-ma.')
    os.umask(0o077)
    PRIVATE.mkdir(mode=0o700, exist_ok=True)
    RUNTIME.mkdir(parents=True, mode=0o750, exist_ok=True)
    env_path = ROOT / '.env.production'
    env_text = env_path.read_text()
    env = dict(line.split('=', 1) for line in env_text.splitlines() if '=' in line and not line.startswith('#'))
    password = env['BOOTSTRAP_INITIAL_PASSWORD'].strip().strip('\"\'')
    auth = None

    def api(path, method='GET', body=None):
        headers = {'Content-Type': 'application/json'}
        if auth:
            headers['Authorization'] = 'Bearer ' + auth
        req = urllib.request.Request(API + path, headers=headers, method=method,
            data=None if body is None else json.dumps(body).encode())
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.load(response)

    auth = api('/v1/auth/login', 'POST', {'email': 'kirish@gmail.com', 'password': password})['token']
    try:
        site = next(row for row in api('/v1/sites') if row['name'] == 'Kirish Farm')
        zones = api('/v1/zones')
        zone = next((row for row in zones if row['site_id'] == site['id'] and row['name'] == 'MQTT Test Zone'), None)
        if not zone:
            zone = api('/v1/admin/sites/' + site['id'] + '/zones', 'POST', {'name': 'MQTT Test Zone'})
        devices = api('/v1/devices?siteId=' + site['id'])
        device = next((row for row in devices if row.get('serial') == 'KIR-MQTT-TEST-001'), None)
        if not device:
            device = api('/v1/admin/devices', 'POST', {'siteId': site['id'], 'zoneId': zone['id'],
                'serial': 'KIR-MQTT-TEST-001', 'name': 'MQTT Test Device (no hardware)', 'model': 'MQTT-EXPLORER'})
        components = api('/v1/devices/' + device['id'] + '/components')
        ids = {}
        for name, kind, channel, key in [('MQTT Test Motor', 'MOTOR', 'relay-1', 'motor'),
                ('Temperature', 'SENSOR', 'temperature-1', 'temperature'), ('Humidity', 'SENSOR', 'humidity-1', 'humidity')]:
            component = next((row for row in components if row['hardware_channel'] == channel), None)
            if not component:
                component = api('/v1/admin/devices/' + device['id'] + '/components', 'POST',
                    {'name': name, 'kind': kind, 'hardwareChannel': channel})
            ids[key] = component['id']
        flows = api('/v1/sites/' + site['id'] + '/operational-flows')
        flow = next((row for row in flows if row['name'] == 'MQTT Test Motor'), None)
        if not flow:
            flow = api('/v1/admin/sites/' + site['id'] + '/operational-flows', 'POST',
                {'name': 'MQTT Test Motor', 'componentIds': [ids['motor']]})
        connection_path = PRIVATE / 'mqtt-connection-private.json'
        connection = json.loads(connection_path.read_text()) if connection_path.exists() else {}
        if connection.get('deviceId') != device['id'] or not connection.get('deviceToken'):
            connection['deviceToken'] = api('/v1/admin/devices/' + device['id'] + '/credential', 'POST', {})['token']
        backend_password = env.get('MQTT_BACKEND_PASSWORD', secrets.token_urlsafe(32))
        backend_username = 'kirish-backend'
        broker_password = connection.get('password', secrets.token_urlsafe(24))
        username = 'device-' + device['id']
        root_topic = 'kirish/devices/' + device['id']
        connection.update({'host': HOST, 'port': 8884, 'tls': True, 'username': username, 'password': broker_password,
            'deviceId': device['id'], 'siteId': site['id'], 'zoneId': zone['id'], 'flowId': flow['id'], 'components': ids,
            'subscribeTopic': root_topic + '/#', 'topics': {suffix: root_topic + '/' + suffix
                for suffix in ['telemetry', 'feedback', 'commands', 'results', 'status']}})
        connection_path.write_text(json.dumps(connection, indent=2) + '\n')
        connection_path.chmod(0o600)
        backup = Path('/opt/backups')
        backup.mkdir(mode=0o700, exist_ok=True)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
        shutil.copy2(env_path, backup / ('kirish-env-before-mqtt-' + stamp))
        updated = [line for line in env_text.splitlines() if not line.startswith(('MQTT_BACKEND_USERNAME=', 'MQTT_BACKEND_PASSWORD='))]
        updated += ['MQTT_BACKEND_USERNAME=' + backend_username, 'MQTT_BACKEND_PASSWORD=' + backend_password]
        env_path.write_text('\n'.join(updated) + '\n')
        env_path.chmod(0o600)

        ca_key = PRIVATE / 'mqtt-ca.key'
        ca_cert = RUNTIME / 'ca.crt'
        if not ca_cert.exists():
            command('openssl', 'req', '-x509', '-newkey', 'rsa:3072', '-nodes', '-sha256', '-days', '3650',
                '-subj', '/CN=Kirish MQTT CA', '-keyout', str(ca_key), '-out', str(ca_cert))
        if not (RUNTIME / 'server.crt').exists():
            command('openssl', 'req', '-newkey', 'rsa:3072', '-nodes', '-subj', '/CN=' + HOST,
                '-keyout', str(RUNTIME / 'server.key'), '-out', str(PRIVATE / 'mqtt-server.csr'))
            extension = PRIVATE / 'mqtt-server.ext'
            extension.write_text('subjectAltName=IP:' + HOST + ',DNS:mqtt,DNS:localhost\nextendedKeyUsage=serverAuth\n')
            command('openssl', 'x509', '-req', '-in', str(PRIVATE / 'mqtt-server.csr'), '-CA', str(ca_cert),
                '-CAkey', str(ca_key), '-CAcreateserial', '-out', str(RUNTIME / 'server.crt'), '-days', '825', '-sha256', '-extfile', str(extension))
        acl_path = RUNTIME / 'acl'
        existing_blocks = []
        if acl_path.exists():
            import re
            existing_blocks = [block for block in re.split(r'(?m)(?=^user )', acl_path.read_text())
                if block.strip() and block.splitlines()[0] not in ['user ' + backend_username, 'user ' + username]]
        acl_path.write_text('user ' + backend_username + '\n' +
            '\n'.join('topic read kirish/devices/+/' + topic for topic in ['telemetry', 'feedback', 'status']) + '\n' +
            '\n'.join('topic write kirish/devices/+/' + topic for topic in ['commands', 'results']) + '\n' +
            'topic read kirish/backend/health\n\nuser ' + username + '\n' +
            '\n'.join('topic read ' + root_topic + '/' + topic for topic in ['commands', 'results']) + '\n' +
            '\n'.join('topic write ' + root_topic + '/' + topic for topic in ['telemetry', 'feedback', 'status']) + '\n' + '\n'.join(existing_blocks))
        command('docker', 'pull', IMAGE)
        for login, secret, create in [(backend_username, backend_password, not (RUNTIME / 'passwords').exists()), (username, broker_password, False)]:
            args = ['docker', 'run', '--rm', '--user', '0', '-v', str(RUNTIME) + ':/runtime', '--entrypoint', 'mosquitto_passwd', IMAGE, '-b']
            if create:
                args.append('-c')
            command(*(args + ['/runtime/passwords', login, secret]))
        os.chown(RUNTIME, 1883, 1883)
        RUNTIME.chmod(0o750)
        for path in RUNTIME.iterdir():
            os.chown(path, 1883, 1883)
            path.chmod(0o640)
        command('ufw', 'allow', '8884/tcp', 'comment', 'Kirish MQTT TLS')
        print(json.dumps({'provisioned': True, 'deviceId': device['id'], 'flowId': flow['id'],
            'tlsPort': 8884, 'privateConnectionFile': str(connection_path)}))
    finally:
        api('/v1/auth/logout', 'POST', {})

if __name__ == '__main__':
    main()

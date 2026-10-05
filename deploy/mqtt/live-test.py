#!/usr/bin/env python3
"""Tests ONLY the explicitly no-hardware Explorer device, via live MQTT/REST.
Requires paho-mqtt==2.1.0. Supply the API through an SSH tunnel for encrypted login.
"""
import argparse
import datetime
import getpass
import json
from pathlib import Path
import queue
import threading
import urllib.request
import uuid
import paho.mqtt.client as mqtt

def broker_checks(connection, ca):
    # Separate clients so the retained-message rejection does not interrupt telemetry.
    rejected = threading.Event()
    anonymous = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id='kirish-anonymous-check-' + uuid.uuid4().hex[:8])
    anonymous.tls_set(ca_certs=ca)
    def anonymous_connect(client, userdata, flags, reason, properties):
        if reason.is_failure:
            rejected.set()
    anonymous.on_connect = anonymous_connect
    anonymous.connect(connection['host'], connection['port'], keepalive=20)
    anonymous.loop_start()
    try:
        assert rejected.wait(10), 'Broker allowed anonymous access or did not respond'
    finally:
        anonymous.disconnect()
        anonymous.loop_stop()
    print('PASS: anonymous broker access denied')

    ready, disconnected = threading.Event(), threading.Event()
    retained = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id='kirish-retain-check-' + uuid.uuid4().hex[:8])
    retained.username_pw_set(connection['username'], connection['password'])
    retained.tls_set(ca_certs=ca)
    def retained_connect(client, userdata, flags, reason, properties):
        if not reason.is_failure:
            ready.set()
    retained.on_connect = retained_connect
    retained.on_disconnect = lambda *args: disconnected.set()
    retained.connect(connection['host'], connection['port'], keepalive=20)
    retained.loop_start()
    try:
        assert ready.wait(10), 'Retained-message probe could not authenticate'
        # An intentionally invalid envelope cannot change state, even if retention were enabled.
        retained.publish(connection['topics']['telemetry'], '{}', qos=1, retain=True)
        assert disconnected.wait(10), 'Broker failed to reject retained publishing'
    finally:
        retained.disconnect()
        retained.loop_stop()
    print('PASS: broker rejects retained publishing')

def main():
    args = argparse.ArgumentParser()
    args.add_argument('--api', default='http://127.0.0.1:15030')
    args.add_argument('--connection', default='mqtt-connection-private.json')
    args.add_argument('--ca', default='kirish-mqtt-ca.crt')
    args = args.parse_args()
    connection = json.loads(Path(args.connection).read_text())
    broker_checks(connection, args.ca)
    login_password = getpass.getpass('Kirish operator API password: ')
    token = None
    def api(path, method='GET', body=None):
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        if path.endswith('/actions'):
            headers['Idempotency-Key'] = str(uuid.uuid4())
        req = urllib.request.Request(args.api + path, method=method, headers=headers,
            data=None if body is None else json.dumps(body).encode())
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.load(response)

    token = api('/v1/auth/login', 'POST', {'email': 'operator@kirish.com', 'password': login_password})['token']
    del login_password
    commands = queue.Queue()
    results = queue.Queue()
    connected = threading.Event()
    subscribed = threading.Event()
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id='kirish-live-test-' + uuid.uuid4().hex[:12], clean_session=True)
    client.username_pw_set(connection['username'], connection['password'])
    client.tls_set(ca_certs=args.ca)
    def on_connect(mqtt_client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            return
        connected.set()
        mqtt_client.subscribe(connection['subscribeTopic'], qos=1)
    def on_message(mqtt_client, userdata, message):
        body = json.loads(message.payload)
        if message.topic.endswith('/commands'):
            commands.put(body)
        elif message.topic.endswith('/results'):
            results.put(body)
    client.on_connect = on_connect
    client.on_subscribe = lambda *args: subscribed.set()
    client.on_message = on_message
    client.connect(connection['host'], connection['port'], keepalive=20)
    client.loop_start()
    def message(**fields):
        return {'messageId': str(uuid.uuid4()), 'token': connection['deviceToken'],
            'measuredAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), **fields}
    def publish(suffix, body):
        client.publish(connection['topics'][suffix], json.dumps(body), qos=1, retain=False).wait_for_publish(timeout=5)
        result = results.get(timeout=10)
        if result.get('messageId') and result['messageId'] != body['messageId']:
            raise AssertionError('Unexpected message result')
        return result
    try:
        assert connected.wait(10) and subscribed.wait(10), 'TLS login/subscription failed'
        device = api('/v1/devices/' + connection['deviceId'])
        assert device['model'] == 'MQTT-EXPLORER' and '(no hardware)' in device['name'], 'Never operate a physical device in this test'
        assert api('/v1/devices/' + connection['deviceId'] + '/diagnostics')['mqtt'] == 'CONNECTED', 'Backend MQTT is not connected'
        print('PASS: external TLS login, subscription and backend connection')
        ids = connection['components']
        body = message(samples=[{'componentId': ids['motor'], 'reportedState': 'STOPPED', 'quality': 'CONFIRMED'},
            {'componentId': ids['temperature'], 'reportedState': 'VALID', 'quality': 'CONFIRMED', 'value': '28.4', 'unit': 'C'},
            {'componentId': ids['humidity'], 'reportedState': 'VALID', 'quality': 'CONFIRMED', 'value': '72', 'unit': '%'}])
        assert publish('telemetry', body).get('stored') is True
        assert publish('telemetry', body).get('duplicate') is True
        readings = [row for row in api('/v1/sites/' + connection['siteId'] + '/readings') if row['component_id'] in ids.values()]
        assert any(row['component_id'] == ids['temperature'] and row['value'] == '28.4' for row in readings)
        assert any(row['component_id'] == ids['humidity'] and row['value'] == '72' for row in readings)
        assert all(row['quality'] != 'SEEDED' for row in readings)
        print('PASS: live telemetry stored and duplicate delivery deduplicated')

        bad = message(componentId=ids['motor'], reportedState='STOPPED', quality='CONFIRMED')
        bad['token'] = 'wrong-token'
        assert publish('feedback', bad).get('code') == 'DEVICE_TOKEN_INVALID'
        expired = message(componentId=ids['temperature'], reportedState='VALID', quality='CONFIRMED', value='999', unit='C')
        expired['measuredAt'] = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=95)).isoformat()
        assert publish('telemetry', expired).get('code') == 'MQTT_MESSAGE_EXPIRED'
        print('PASS: wrong device token and expired telemetry rejected')

        # This account must not be able to impersonate the backend, even for its own test device.
        client.publish(connection['topics']['commands'], json.dumps({'action': 'DENIED-ACL-PROBE'}), qos=1, retain=False).wait_for_publish(timeout=5)
        try:
            commands.get(timeout=2)
            raise AssertionError('Test account was incorrectly allowed to publish commands')
        except queue.Empty:
            pass
        print('PASS: Explorer account cannot publish backend commands')

        for action, command_action, state in [('ON', 'START', 'RUNNING'), ('OFF', 'STOP', 'STOPPED')]:
            run = api('/v1/operational-flows/' + connection['flowId'] + '/actions', 'POST', {'action': action})
            assert run['state'] == 'WAITING_FEEDBACK'
            command = commands.get(timeout=10)
            assert command['action'] == command_action and command['componentId'] == ids['motor'] and command['deviceId'] == connection['deviceId']
            assert command['expectedState'] == state
            assert datetime.datetime.fromisoformat(command['expiresAt'].replace('Z', '+00:00')) > datetime.datetime.now(datetime.timezone.utc)
            ack = message(componentId=ids['motor'], reportedState=state, quality='CONFIRMED', commandId=command['commandId'])
            assert publish('feedback', ack).get('stored') is True
            assert api('/v1/operational-runs/' + run['id'])['state'] == 'CONFIRMED'
            assert api('/v1/operational-flows/' + connection['flowId'])['currentState'] == action
            print('PASS: REST ' + action + ' → MQTT ' + command_action + ' → feedback → CONFIRMED')
        assert publish('status', message(status='OFFLINE')).get('stored') is True
        assert api('/v1/devices/' + connection['deviceId'])['status'] == 'OFFLINE'
        print('PASS: test device left OFFLINE with motor STOPPED; no physical hardware operated')
    finally:
        client.disconnect()
        client.loop_stop()
        api('/v1/auth/logout', 'POST', {})

if __name__ == '__main__':
    main()

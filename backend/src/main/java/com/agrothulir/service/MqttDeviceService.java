package com.agrothulir.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** MQTT adapter boundary. Broker publishing and feedback subscription will be added here. */
@Service
public class MqttDeviceService {
    private static final Logger log = LoggerFactory.getLogger(MqttDeviceService.class);

    public void commandQueued(String commandId, String deviceId, String componentId, String action) {
        log.info("MQTT handoff pending: commandId={}, deviceId={}, componentId={}, action={}. " +
            "No broker publisher is configured; waiting for controller acknowledgement.",
            commandId, deviceId, componentId, action);
    }

    public void feedbackReceived(String deviceId, String componentId, String reportedState) {
        log.info("Device feedback received: deviceId={}, componentId={}, reportedState={}",
            deviceId, componentId, reportedState);
    }
}

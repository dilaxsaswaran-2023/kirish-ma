package com.agrothulir.service;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class MqttConnectionSettingsTest {
    private MqttConnectionSettings settings(String url, String username, String password, boolean anonymous, boolean tls) {
        return new MqttConnectionSettings(true, url, username, password, anonymous, tls, "kirish-test", "kirish");
    }

    @Test void externalAnonymousTlsDoesNotSendOldBrokerCredentials() {
        var connection = settings("ssl://mqtt.sathurix.com:8883", "", "", true, true).connectionOptions();
        assertThat(connection.getUserName()).isNull();
        assertThat(connection.getPassword()).isNull();
        assertThat(connection.isHttpsHostnameVerificationEnabled()).isTrue();
        assertThat(connection.isCleanSession()).isTrue();
        assertThat(connection.isAutomaticReconnect()).isFalse();
    }

    @Test void authenticatedBrokerRemainsSupported() {
        var connection = settings("ssl://mqtt.sathurix.com:8883", "backend-user", "secret", false, true).connectionOptions();
        assertThat(connection.getUserName()).isEqualTo("backend-user");
        assertThat(connection.getPassword()).containsExactly("secret".toCharArray());
        assertThat(connection.isHttpsHostnameVerificationEnabled()).isTrue();
    }

    @Test void anonymousAccessRequiresExplicitOptIn() {
        assertThatThrownBy(() -> settings("ssl://mqtt.sathurix.com:8883", "", "", false, true))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("MQTT_ALLOW_ANONYMOUS");
    }

    @Test void incompleteCredentialsAreRejectedEvenWithAnonymousOptIn() {
        assertThatThrownBy(() -> settings("ssl://mqtt.sathurix.com:8883", "user", "", true, true))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void productionCannotDowngradeToCleartext() {
        assertThatThrownBy(() -> settings("tcp://mqtt.sathurix.com:1883", "", "", true, true))
            .hasMessageContaining("requires TLS");
    }

    @Test void insecureDevelopmentListenerRequiresExplicitTlsOptOut() {
        assertThatCode(() -> settings("tcp://localhost:1883", "user", "secret", false, false)).doesNotThrowAnyException();
    }

    @Test void mqttExplorerUrlAndInlineCredentialsAreNotAcceptedAsBackendUrls() {
        assertThatThrownBy(() -> settings("mqtt://mqtt.sathurix.com:8883/", "", "", true, true))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> settings("ssl://user:secret@mqtt.sathurix.com:8883", "", "", true, true))
            .isInstanceOf(IllegalArgumentException.class);
    }
}

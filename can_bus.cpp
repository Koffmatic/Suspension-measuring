#include "can_bus.h"
#include "config.h"
#include "measurements.h"

#include <Arduino.h>

static bool canInitialized = false;

void initCAN()
{
    pinMode(CAN_SE_PIN, OUTPUT);
    digitalWrite(CAN_SE_PIN, LOW);   // SN65HVD231

    twai_general_config_t g_config =
        TWAI_GENERAL_CONFIG_DEFAULT(CAN_TX_PIN, CAN_RX_PIN, TWAI_MODE_NORMAL);

    twai_timing_config_t t_config = TWAI_TIMING_CONFIG_500KBITS();
    twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();

    if (twai_driver_install(&g_config, &t_config, &f_config) != ESP_OK) {
        Serial.println("TWAI driver install failed");
        return;
    }

    if (twai_start() != ESP_OK) {
        Serial.println("TWAI start failed");
        return;
    }

    canInitialized = true;
    Serial.println("CAN initialized");
    
    twai_status_info_t status;
    twai_get_status_info(&status);

    Serial.print("TWAI state: ");
    Serial.println(status.state);

}

void handleCAN()
{
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint > 2000) {
        Serial.println("handleCAN alive");
        lastPrint = millis();
    }

    if (!canInitialized) {
        return;
    }

    twai_message_t msg;
    if (twai_receive(&msg, 0) == ESP_OK) {
        handleCANMessage(msg);
    }
}

bool sendCANFrame(const twai_message_t& msg)
{
    esp_err_t res = twai_transmit(&msg, pdMS_TO_TICKS(50));
    if (res != ESP_OK) {
        Serial.print("CAN TX failed, err=");
        Serial.println(res);
        return false;
    }
    return true;
}



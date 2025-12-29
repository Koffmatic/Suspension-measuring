#include "can_bus.h"
#include "config.h"
#include "measurements.h"
#include "debug.h"

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
        DBG_ERROR("[CAN][ERR] TWAI driver install failed");
        return;
    }

    if (twai_start() != ESP_OK) {
        DBG_ERROR("[CAN][ERR] TWAI start failed");
        return;
    }

    canInitialized = true;
    DBG_INFO("[CAN] initialized");

    twai_status_info_t status;
    twai_get_status_info(&status);
    DBG_INFOF("[CAN] TWAI state: %d\n", status.state);
}

void handleCAN()
{
    // Alive debug (verbose only)
    static uint32_t lastAlive = 0;
    if (debugLevel >= DEBUG_VERBOSE && millis() - lastAlive > 1000) {
        DBG_VERBOSE("[CAN] handleCAN alive");
        lastAlive = millis();
    }

    if (!canInitialized) {
        return;
    }

    twai_message_t msg;
    esp_err_t res = twai_receive(&msg, 0);

    if (res == ESP_OK) {
        DBG_VERBOSEF("[CAN][RX] ID=0x%lX DLC=%d\n",
                    msg.identifier,
                    msg.data_length_code);

        handleCANMessage(msg);
    }
    else if (res != ESP_ERR_TIMEOUT) {
        // Timeout is normal when no data is available
        DBG_ERRORF("[CAN][RX][ERR] receive failed, err=%d\n", res);
    }
}

bool sendCANFrame(const twai_message_t& msg)
{
    esp_err_t res = twai_transmit(&msg, pdMS_TO_TICKS(50));
    if (res != ESP_OK) {
        DBG_ERRORF("[CAN][TX][ERR] transmit failed, err=%d\n", res);
        return false;
    }
    return true;
}

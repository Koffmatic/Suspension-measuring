#pragma once

#include <stdint.h>
#include <driver/twai.h>

// external active device ID (defined in main)
extern uint8_t actID;

// Init / lifecycle
void initCAN();
void handleCAN();

// TX
bool sendCANFrame(const twai_message_t& msg);
// CAN mode
typedef enum {
    CAN_MODE_NORMAL = 0,
    CAN_MODE_SNIFFER
} CanMode;

extern CanMode canMode;

// CAN frame
struct CanFrame {
    uint32_t id;
    uint8_t  dlc;
    uint8_t  data[8];
};
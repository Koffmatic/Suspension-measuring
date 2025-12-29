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
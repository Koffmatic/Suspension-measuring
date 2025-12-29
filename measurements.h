#pragma once

#include <driver/twai.h>

extern float measuredLength[4];

void initMeasurements();
void updateMeasurements();

// RX entry point
void handleCANMessage(const twai_message_t& msg);

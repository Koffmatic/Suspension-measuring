#pragma once
#include <stdint.h>
#include <driver/twai.h>

namespace BriterEncoder {

    constexpr uint8_t FIRST_ID = 3;
    constexpr uint8_t LAST_ID  = 6;

    // Protocol function codes
    constexpr uint8_t FUNC_READ = 0x01;
    constexpr uint8_t FUNC_ZERO = 0x06;

    // TX commands
    void sendRead(uint8_t id);
    void sendZero(uint8_t id);
    void sendZeroAll();

    // RX handling
    bool isBriterMessage(const twai_message_t& msg);
    bool parseReadResponse(const twai_message_t& msg,
                           uint8_t& outId,
                           int32_t& outRaw);
}

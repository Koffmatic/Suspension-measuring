#include "BriterEncoder.h"
#include "can_bus.h"
#include <Arduino.h>

namespace BriterEncoder {

    bool parseReadResponse(const twai_message_t& msg,
                       uint8_t& outId,
                       int32_t& outRaw)
    {
        if (msg.data_length_code < 7) return false;
        if (msg.data[2] != FUNC_READ) return false;

        outId = msg.data[1];

        outRaw =
            (int32_t)msg.data[3] |
            ((int32_t)msg.data[4] << 8) |
            ((int32_t)msg.data[5] << 16) |
            ((int32_t)msg.data[6] << 24);

        return true;
    }

    void sendRead(uint8_t id)
    {
        twai_message_t msg = {};
        msg.identifier = id;
        msg.extd = 0;
        msg.rtr = 0;

        // LEN = 3 (LEN + ID + FUNC)
        msg.data_length_code = 3;
        msg.data[0] = 0x03;
        msg.data[1] = id;
        msg.data[2] = FUNC_READ;

        sendCANFrame(msg);
    }

    void sendZero(uint8_t id)
    {
        Serial.print("Zeroing encoder ID ");
        Serial.println(id);

        twai_message_t msg = {};
        msg.identifier = id;
        msg.extd = 0;
        msg.rtr = 0;

        msg.data_length_code = 3;
        msg.data[0] = 0x03;
        msg.data[1] = id;
        msg.data[2] = FUNC_ZERO;

        sendCANFrame(msg);
    }

    void sendZeroAll()
    {
        Serial.println("ZERO ALL encoders (IDs 3..6)");

        for (uint8_t id = FIRST_ID; id <= LAST_ID; id++) {
            sendZero(id);
            delay(20);
        }

        Serial.println("ZERO ALL done");
    }
} // namespace BriterEncoder
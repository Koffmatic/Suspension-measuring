#include "sdlog.h"

#include <Arduino.h>
#include <SD.h>
#include <esp_timer.h>

/* =========================
 *  SDLOG CONFIGURATION
 * ========================= */

/*
 * SDLOG_BUFFER_SIZE
 *
 * Size of the internal ring buffer in bytes.
 *
 * - Increase if SD card write latency causes dropped records.
 * - Decrease only if RAM usage becomes an issue.
 *
 * IMPORTANT:
 * - Must be larger than the largest single record.
 * - Must leave enough free RAM for other tasks and stacks.
 * - Changing this does NOT change the on-disk file format.
 *
 * Typical CAN sniffing:
 *   32 kB  -> safe default
 *   64 kB  -> heavy traffic / slow SD cards
 */
#define SDLOG_BUFFER_SIZE   (32 * 1024)

/*
 * SDLOG_TASK_STACK
 *
 * Stack size for the SD writer task.
 *
 * IMPORTANT:
 * - This task performs only buffered file writes.
 * - Do NOT reduce this unless you know actual stack usage.
 * - Increasing this is safe but usually unnecessary.
 */
#define SDLOG_TASK_STACK    4096

/*
 * SDLOG_TASK_PRIO
 *
 * FreeRTOS task priority for the SD writer.
 *
 * IMPORTANT:
 * - Must be lower than real-time data acquisition tasks.
 * - Must be high enough to drain the buffer in time.
 */
#define SDLOG_TASK_PRIO     1

/* =========================
 *  INTERNAL STATE
 * ========================= */

static uint8_t  buffer[SDLOG_BUFFER_SIZE];
static volatile size_t writePos = 0;
static volatile size_t readPos  = 0;

static volatile bool logRunning = false;
static volatile uint32_t droppedRecords = 0;

static File logFile;
static TaskHandle_t sdTaskHandle = nullptr;

/* =========================
 *  FILE HEADER
 * ========================= */

typedef struct __attribute__((packed)) {
    uint8_t magic[4];   // "SDLG"
    uint8_t version;   // SDLOG_VERSION
} SdlogFileHeader;

/* =========================
 *  RING BUFFER
 * ========================= */

static size_t buffer_free(void)
{
    if (writePos >= readPos)
        return SDLOG_BUFFER_SIZE - (writePos - readPos) - 1;
    else
        return (readPos - writePos) - 1;
}

static bool buffer_write(const uint8_t* data, size_t len)
{
    if (buffer_free() < len)
        return false;

    for (size_t i = 0; i < len; i++) {
        buffer[writePos] = data[i];
        writePos = (writePos + 1) % SDLOG_BUFFER_SIZE;
    }
    return true;
}

static size_t buffer_read(uint8_t* dst, size_t maxLen)
{
    size_t count = 0;

    while ((readPos != writePos) && (count < maxLen)) {
        dst[count++] = buffer[readPos];
        readPos = (readPos + 1) % SDLOG_BUFFER_SIZE;
    }
    return count;
}

/* =========================
 *  SD WRITER TASK
 * ========================= */

static void sdlog_task(void*)
{
    uint8_t localBuf[512];

    while (true) {
        if (!logRunning) {
            vTaskDelay(pdMS_TO_TICKS(50));
            continue;
        }

        size_t n = buffer_read(localBuf, sizeof(localBuf));
        if (n > 0) {
            logFile.write(localBuf, n);
        } else {
            vTaskDelay(pdMS_TO_TICKS(5));
        }
    }
}

/* =========================
 *  VEHICLE / CAN LOGGING
 * ========================= */

void sdlog_log_vehicle_frame(const CanFrame& frame)
{
    if (!logRunning)
        return;

    SdlogVehicleRecord rec = {
        .type   = REC_VEHICLE,
        .ts_us  = esp_timer_get_time(),
        .can_id = frame.id,
        .dlc    = frame.dlc
    };

    // Copy valid data bytes
    memcpy(rec.data, frame.data, frame.dlc);

    // Zero remaining bytes (clean binary layout)
    if (frame.dlc < 8) {
        memset(rec.data + frame.dlc, 0, 8 - frame.dlc);
    }

    sdlog_push(&rec, sizeof(rec));
}

/* =========================
 *  PUBLIC API
 * ========================= */

bool sdlog_init(void)
{
    if (!SD.begin())
        return false;

    if (sdTaskHandle == nullptr) {
        xTaskCreate(
            sdlog_task,
            "sdlog",
            SDLOG_TASK_STACK,
            nullptr,
            SDLOG_TASK_PRIO,
            &sdTaskHandle
        );
    }

    return true;
}

bool sdlog_start(void)
{
    if (logRunning)
        return false;

    char filename[32];
    uint32_t idx = 0;

    do {
        snprintf(filename, sizeof(filename), "/LOG_%04lu.BIN", idx++);
    } while (SD.exists(filename) && idx < 10000);

    logFile = SD.open(filename, FILE_WRITE);
    if (!logFile)
        return false;

    // NOTE:
    // Log files are always created with a new filename.
    // Existing files are never overwritten or appended to.

    SdlogFileHeader hdr = {
        .magic   = { 'S', 'D', 'L', 'G' },
        .version = SDLOG_VERSION
    };

    logFile.write(reinterpret_cast<const uint8_t*>(&hdr), sizeof(hdr));
    logFile.flush();

    writePos = readPos = 0;
    droppedRecords = 0;
    logRunning = true;

    return true;
}

void sdlog_stop(void)
{
    logRunning = false;

    vTaskDelay(pdMS_TO_TICKS(50));

    if (logFile) {
        logFile.flush();
        logFile.close();
    }
}

bool sdlog_push(const void* data, size_t len)
{
    if (!logRunning)
        return true;

    if (!buffer_write(static_cast<const uint8_t*>(data), len)) {
        droppedRecords++;
        return false;
    }
    return true;
}

bool sdlog_is_running(void)
{
    return logRunning;
}

uint32_t sdlog_dropped(void)
{
    return droppedRecords;
}

void sdlog_log_sniff(const CanFrame& frame)
{
    if (!logRunning)
        return;

    SdlogSniffRecord rec = {
        .type   = REC_SNIFF,
        .ts_us  = esp_timer_get_time(),
        .can_id = frame.id,
        .dlc    = frame.dlc
    };

    memcpy(rec.data, frame.data, frame.dlc);
    if (frame.dlc < 8) {
        memset(rec.data + frame.dlc, 0, 8 - frame.dlc);
    }

    sdlog_push(&rec, sizeof(rec));
}
# Suspension Measuring (ESP32 + CAN)

This project is an ESP32-based suspension measurement system using CAN-connected
absolute encoders. The primary goal is to measure and log suspension movement
during real riding conditions.

The project is developed primarily for personal use, but with a structure that
could support future extensions or broader use.

---

## Features

- CAN bus communication using the ESP32 TWAI driver
- Support for Briter CAN absolute encoders
- Multi-encoder polling
- Encoder zeroing via CAN commands
- Serial CLI for debugging and control
- Modular code structure (CAN / Encoder / Measurements / CLI)

---

## Hardware

- ESP32 development board  
  - Primary development board: **LilyGO T-CAN485**
    (https://github.com/Xinyuan-LilyGO/T-CAN485)
- CAN transceiver (on-board on T-CAN485) (SN65HVD230)
- Briter CAN absolute encoders
- Custom mechanical mounting for suspension measurement

---

## Project Status

⚠️ **Work in progress**

Current state:
- Measurement reading: ✅ working
- CAN-based zeroing: ✅ working
- Serial debug output: ⚠️ partial
- SD card logging: ⏳ planned
- OTA updates: ⏳ planned
- Multi-ESP32 communication: ⏳ planned

---

## Build Environment

- Arduino IDE
- ESP32 Arduino core
- Native ESP32 TWAI (CAN) driver

---

## Development Board and Libraries

This project is developed and tested primarily on the **LilyGO T-CAN485** ESP32 board.

Parts of the project structure and CAN initialization are based on examples and
libraries provided by LilyGO for the T-CAN485 board:

https://github.com/Xinyuan-LilyGO/T-CAN485

The code has since been adapted and refactored to use the native ESP32 TWAI (CAN)
driver and a modular project structure tailored for suspension measurement.

---

## Notes

This repository currently follows Arduino IDE compatibility rules.
A future migration to PlatformIO is planned once the feature set stabilizes.

Commits are expected to represent working states tested with real hardware.

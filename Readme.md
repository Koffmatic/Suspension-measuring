# Suspension Measuring System

Suspension measuring and logging system based on **ESP32 + CAN bus**, designed primarily for snowmobile suspension analysis.  
Project focuses on **robust CAN communication, clean architecture, and extensible debugging/logging features**.

This is a personal project, but structured with product-level maintainability in mind.

---

## Hardware

### Main development board
- **LilyGO T-CAN485**
  - ESP32
  - SN65HVD231 CAN transceiver  
  - Board repository:  
    https://github.com/Xinyuan-LilyGO/T-CAN485

### Sensors
- **Briter CAN absolute encoders**
  - Used for suspension position measurement
  - Encoder IDs start from **ID 3**

---

## Features (current)

- CAN bus communication using **ESP32 TWAI driver**
- Periodic polling of multiple CAN encoders
- Conversion of raw encoder values to physical suspension length
- Serial CLI for diagnostics and control
- Configurable debug system with runtime control
- Modular C++ architecture (no Arduino `.ino` monolith)

---

## Serial CLI

Connect to the board via serial monitor (115200 baud).

### Available commands

help
status    Show measured values
zero <id>   Zero encoder (ID 3..6)
zeroall   Zero all encoders
debug   Show current debug level
debug off|error|info|verbose

---

## Debug System

The project uses a global debug system with multiple levels:

- `OFF`     – No debug output
- `ERROR`   – Only critical errors
- `INFO`    – Initialization and system status
- `VERBOSE` – Detailed CAN and measurement diagnostics

Debug level can be changed at runtime via the serial CLI:

All debug output is routed through `debug.h`, allowing easy future extension without modifying core logic.

---

## Project Structure

SuspensionMeas/
├── config.h
├── SuspensionMeas.ino
├── core/
│ ├── can_bus.cpp / .h
│ ├── BriterEncoder.cpp / .h
│ ├── measurements.cpp / .h
├── cli/
│ └── serial_cli.cpp / .h
├── debug/
│ └── debug.cpp / .h
├── show_values.cpp / .h


The structure is intentionally modular to support future features without major refactoring.

---

## Planned Features

- SD card logging
- OTA firmware updates
- Measurement buffering / history
- Multi-device ESP32 communication
- Optional wireless data transfer
- **BRP snowmobile ECU CAN data sniffing and logging (if data access is possible)**

These features are intentionally **not yet implemented**, to keep the current system stable and testable.

---

## Versioning

- **v0.1**
  - First stable version
  - CAN communication working
  - Measurements validated
  - Serial CLI and debug system implemented

---

## Notes

This project prioritizes:
- clarity over cleverness
- explicit error handling
- separation of responsibilities
- long-term maintainability

---

## Contact

For questions, ideas, or further project details, feel free to contact:

**koffmatic@gmail.com**

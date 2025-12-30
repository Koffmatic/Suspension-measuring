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
- SD card logging with binary record format
- Ring-buffered SD writer task for reliable high-rate logging
- Versioned binary log file format (forward compatible)
- CAN sniffer mode (RX-only, no bus transmission)


---

## Serial CLI

Connect to the board via serial monitor (115200 baud).
The serial CLI is also used as a transport layer for SD card interaction,
enabling file listing and binary data transfer without removing the SD card.


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

## SD Card Logging

The system supports **binary SD card logging** designed for high-rate CAN traffic and sensor data.

### Key characteristics

- FAT32 formatted SD cards (recommended: 8–32 GB)
- Append-only binary log files (`LOG_XXXX.BIN`)
- Fixed record structures with type identifiers
- Microsecond-resolution timestamps
- Ring buffer to decouple real-time acquisition from SD write latency
- Writer task runs at low priority to avoid disturbing measurements

The log file starts with a small header containing:
- Magic identifier (`SDLG`)
- Log format version

This allows future format changes while maintaining backward compatibility.

---

## CAN Sniffer Mode

In addition to normal operation, the system supports a **CAN sniffer mode**.

In sniffer mode:
- CAN transmission is fully disabled in software
- The ESP32 operates as a passive RX-only listener
- All received CAN frames can be logged directly to SD
- No encoder polling or sensor processing is performed

This mode is intended for:
- Reverse engineering vehicle CAN traffic
- ECU data exploration
- Safe monitoring of unknown CAN buses

Sniffer mode can be extended in the future with:
- Runtime bitrate switching
- CAN ID filtering
- Selective logging

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

- Extended SD log tooling and analysis utilities
- OTA firmware updates
- Measurement buffering / history
- Multi-device ESP32 communication
- Optional wireless data transfer
- **BRP snowmobile ECU CAN data sniffing and logging (if data access is possible)**

These features are intentionally **not yet implemented**, to keep the current system stable and testable.

### Planned PC Tooling

A lightweight **Python-based desktop application** is planned to simplify SD log access.

Planned features:
- Serial port selection
- SD card directory listing via CLI commands
- Selective download of log files over USB
- No SD card removal required
- Cross-platform (Windows / Linux)

The application will be implemented using:
- Python
- pyserial
- customtkinter for the graphical interface

The goal is to provide a simple and robust workflow:
ESP32 → USB → PC → offline analysis.


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

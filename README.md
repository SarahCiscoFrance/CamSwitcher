# CamSwitcher

Webex Room Device macro to switch input source to camera (QuadCam, Webex PTZ, etc.) pointed in the direction of the area of the room that has audio activity as detected by the table microphones in the zone.

## Requirements

- Devices must be running RoomOS 10.8 or later

## Installation/Configuration

### 1. Equipment setup

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Setup.png" width="900">
</p>

### 2. Create your preset

Before installing the macro, do not forget to define one or more presets on the appropriate cameras.

For this, you have on the navigator a camera icon at the top right of the screen, click on it.

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Navigator1.png" width="700">
</p>

Then select a camera, make your settings (pan, tilt and zoom) and save your preset.

**Add a camera position preset**

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Navigator2.png" width="1000">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Navigator3.png" width="1000">
</p>

### 3. Edit & Install the Macro

Before editing the macro you need to understand the logic.

In the macro you will find 3 lists : `MIC_CONNECTORS`, `MAP_CAMERA_SOURCE_IDS` and `MAP_PRESET_NUMBERS`

| List name             | Purpose                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| MIC_CONNECTORS        | Microphone Input Numbers to Monitor                                        |
| MAP_CAMERA_SOURCE_IDS | Camera source IDs that correspond to each microphone in MIC_CONNECTORS     |
| MAP_PRESET_NUMBERS    | Camera Preset numbers that correspond to each microphone in MIC_CONNECTORS |

**Example:**

```(js)
const MIC_CONNECTORS =        [1,2,3];
const MAP_CAMERA_SOURCE_IDS = [2,1,1];
const MAP_PRESET_NUMBERS =    [0,1,2];
```

[`1`,2,3];<br>
[`2`,1,1];<br>
[`0`,1,2];

_Micro at Input n°1 manage Camera 2 and does not apply a preset (because 0)._

---

[1,`2`,3];<br>
[2,`1`,1];<br>
[0,`1`,2];

_Micro at Input n°2 manage Camera 1 and apply the preset n°1._

---

[1,2,`3`];<br>
[2,1,`1`];<br>
[0,1,`2`];

_Micro at Input n°3 manage Camera 1 and apply the preset n°2._

---

Also you can set the value of `const NEW_SPEAKER_TIME`which is the time (in milliseconds) to wait before switching to a new speaker.

# CamSwitcher

Webex Room Device macro to switch input source to camera (QuadCam, Webex PTZ, etc.) pointed in the direction of the area of the room that has audio activity as detected by the table microphones in the zone.

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Presentation.png" width="1000">
</p>

## Requirements

- Devices must be running RoomOS 10.8 or later

## Installation/Configuration

### 1. Equipment setup

#### Cisco Webex Codec Pro

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Setup.png" width="900">
</p>

#### Cisco Webex Quad Camera

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Setup2.png" width="500">
</p>

#### Cisco Webex PTZ 4K Camera

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Setup3.png" width="500">
</p>

### 2. Create your preset

Before installing the macro, do not forget to define one or more presets on the appropriate cameras and to define a default preset for each camera.

For this, you have on the navigator a camera icon at the top right of the screen, click on it.

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Navigator1.png" width="700">
</p>

Then select a camera, make your settings (pan, tilt and zoom) and save your preset.

**Step to follow to add a camera position preset**

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Navigator2.png" width="1000">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Navigator3.png" width="1000">
</p>

**Use a preset as default position**

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Default-postion.png" width="500">
</p>

### 3. Edit & Install the Macro

In this macro there are several variables to define before you can use it correctly.

These variables are :

| Name                         | Description                                                                                                                                                              | Type            | Exemple   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | --------- |
| `MIC_CONNECTORS`             | Microphone Input Numbers to Monitor                                                                                                                                      | Array of Number | `[1,2,3]` |
| `MAP_CAMERA_SOURCE_IDS`      | Camera source IDs that correspond to each microphone in `MIC_CONNECTORS`                                                                                                 | Array of Number | `[1,2,2]` |
| `MAP_PRESET_NUMBERS`         | Camera Preset numbers that correspond to each microphone in `MIC_CONNECTORS`                                                                                             | Array of Number | `[0,1,2]` |
| `overviewShowDouble`         | Option to enable Side-by-Side in overview mode when no one is speaking.                                                                                                  | Boolean         | `true`    |
| `OVERVIEW_DOUBLE_SOURCE_IDS` | Specify the source video array of two IDs to use when in overview mode if you set `overviewShowDouble` to `true` (i.e. use in camera associated to video input 1 and 2). | Array of Number | `[1,2]`   |
| `OVERVIEW_SINGLE_SOURCE_ID`  | Specify the source video ID to use when in overview mode if you set `overviewShowDouble` to `false` (i.e. use in camera associated to video input 1).                    | Number          | `1`       |
| `NEW_SPEAKER_TIME`           | Time (in milliseconds) to wait before switching to a new speaker.                                                                                                        | Number          | `2000`    |
| `SIDE_BY_SIDE_TIME`          | Time (in milliseconds) to wait for silence before setting Speakertrack Side-by-Side mode.                                                                                | Number          | `7000`    |

Before editing the macro you need to understand the logic.

To do so, read the following sections :

- [Mics Cameras and Preset Mapping](#mics-cameras-and-preset-mapping)
- [Side by Side Mode](#side-by-side-mode)
- [Video Switching Timing:](#video-switching-timing)

## Mics Cameras and Preset Mapping

In the macro you will find 3 lists : `MIC_CONNECTORS`, `MAP_CAMERA_SOURCE_IDS` and `MAP_PRESET_NUMBERS`

| List name               | Purpose                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- |
| `MIC_CONNECTORS`        | Microphone Input Numbers to Monitor.                                          |
| `MAP_CAMERA_SOURCE_IDS` | Camera source IDs that correspond to each microphone in `MIC_CONNECTORS`.     |
| `MAP_PRESET_NUMBERS`    | Camera Preset numbers that correspond to each microphone in `MIC_CONNECTORS`. |

## Example:

> **Context:**<br><br>Let's say we have 3 micro connected respectively to input 1, 2 and 3. <br><br>In addition we have our QuadCam connected to video input 1 and the PTZ 4K camera connected to video input 2.
> <br><br>Moreover let's say we created 2 presets on the PTZ 4K camera :

> - Preset n°1 called "my preset"
> - Preset n°2 called "my preset 2"

<p align="center">
  <img src="https://raw.githubusercontent.com/SarahCiscoFrance/CamSwitcher/main/pictures/Preset.png" width="600">
</p>

> Note: Remember that each camera must have a default preset. So here we can create 2 more presets which we use as default position.

**Considering the context, the content of the lists must be as follows:**

```(js)
const MIC_CONNECTORS =        [1,2,3];
const MAP_CAMERA_SOURCE_IDS = [1,2,2];
const MAP_PRESET_NUMBERS =    [0,1,2];
```

[`1`,2,3];<br>
[`1`,2,2];<br>
[`0`,1,2];

_Micro at Input n°1 manage Camera 1 and does not apply a preset (because 0)._

---

[1,`2`,3];<br>
[1,`2`,2];<br>
[0,`1`,2];

_Micro at Input n°2 manage Camera 2 and apply the preset n°1._

---

[1,2,`3`];<br>
[1,2,`2`];<br>
[0,1,`2`];

_Micro at Input n°3 manage Camera 2 and apply the preset n°2._

---

Now that you understand the logic you can set these lists.

## Side by Side Mode:

`overviewShowDouble` defines what is shown on the far end when in "overview" mode where nobody is speaking or there is no prominent speaker detected by any of the microphones.

| value   | purpose                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `true`  | **Use "side-by-side" mode as your default. The two source video ID defined in `OVERVIEW_DOUBLE_SOURCE_IDS` will be shown side by side.** |
| `false` | **Doesn't use side-by-side mode. Instead it will use the source video ID you specified in `OVERVIEW_SINGLE_SOURCE_ID`.**                 |

## Video Switching Timing:

| variable            | value                | purpose                                                                |
| ------------------- | -------------------- | ---------------------------------------------------------------------- |
| `NEW_SPEAKER_TIME`  | time in milliseconds | Time to wait before switching to a new speaker.                        |
| `SIDE_BY_SIDE_TIME` | time in milliseconds | Time to wait for silence before setting Speakertrack Side-by-Side mode |

---

Finally, once all variables are defined you can install the macro.

**Note:** the macro is of course only active during a call

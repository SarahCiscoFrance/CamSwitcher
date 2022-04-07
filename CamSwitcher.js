/**
 * Name: CamSwitcher
 * Author: rudferna@cisco.com
 * Date: 30/03/2022
 * Version: 1.2
 * Inspired by https://github.com/gve-sw/GVE_DevNet_WebexDevicesExecutiveRoomQuadCamSwitcherMacro
 */

 import xapi from 'xapi';

 // Microphone Input Numbers to Monitor
 // Specify the input connectors associated to the microphones being used in the room
 // For example, if you set the value to [1,2,3,4,5,6,7,8] the macro will evaluate mic input id's 1-8 for it's switching logic
 const MIC_CONNECTORS = [1,2,3];
 
 // Camera source IDs that correspond to each microphone in MIC_CONNECTORS array
 // Associate the connectors to specific input source ID corresponding to the camera that covers where the mic is located.
 // For example, if you set the value to [1,1,1,1,2,2,2,2] and MIC_CONNECTORS = [1,2,3,4,5,6,7,8] you are specifying that
 // mics 1,2,3 and 4 are located where Camera associated to video input 1 is pointing at and
 // mics 5,6,7 and 8 are located where Camera associated to video input 2 is pointing at
 const MAP_CAMERA_SOURCE_IDS = [1,2,2];
 
 // Camera Preset numbers that correspond to each microphone in MIC_CONNECTORS array
 // Associate the connectors to specific camera preset number corresponding to the position of the camera that covers where the mic is located.
 // For example, if you set the value to [0,29,30,31] and MIC_CONNECTORS = [1,2,3,4] you are specifying that
 // mic 1 has no camera preset associated and mics 2,3 and 4 have respectively the camera preset n°29,30 and 31 associated
 const MAP_PRESET_NUMBERS = [0,1,2];
 
 // overviewShowMultiple defines what is shown on the far end (the video the codec sends into the call or conference) when in "overview" mode where nobody is speaking or there is no
 // prominent speaker detected by any of the microphones
 // INSTRUCTIONS: If you are using side-by-side mode as your default - "overviewShowMultiple = true" - then you must set up a default camera preset for each camera (Quad Camera and PTZ 4K)
 // Through the Navigator interface you can use a preset as default position .
 const overviewShowMultiple = true;
 
 // OVERVIEW_SINGLE_SOURCE_ID specifies the source video ID to use when in overview mode if you set overviewShowMultiple to false
 const OVERVIEW_SINGLE_SOURCE_ID = 1;
 
 // OVERVIEW_MULTIPLE_SOURCE_IDS specifies the source video array of IDs to use when in overview mode if you set overviewShowMultiple to true
 // it will display the sources side by side on the main screen with the first value of the array on the
 // left and the second on the right, etc.
 const OVERVIEW_MULTIPLE_SOURCE_IDS = [1,2];

 // useDefaultPreset defines if default preset should be apply on each camera when nobody is speaking or there is no
 // prominent speaker detected by any of the microphones
 const useDefaultPreset = false
 
 // Microphone High/Low Thresholds
 const MICROPHONELOW  = 6;
 const MICROPHONEHIGH = 25;
 
 // Time to wait for silence before setting Speakertrack Side-by-Side mode
 const SIDE_BY_SIDE_TIME = 7000; // 7 seconds
 // Time to wait before switching to a new speaker
 const NEW_SPEAKER_TIME = 2000; // 2 seconds
 
 let allowNewSpeaker = true;
 let newSpeakerTimer = null;
 let allowSideBySide = true;
 let lowWasRecalled = false;
 let lastActiveHighInput = 0;
 let sideBySideTimer = null;
 let manual_mode = true;
 let allowCameraSwitching = false;
 let micHandler= () => void 0;
 let micArrays={};
 for (var i in MIC_CONNECTORS) {
     micArrays[MIC_CONNECTORS[i].toString()]=[0,0,0,0];
 }
 
 function init() {
   console.log('init...');
 
   // Stop any VuMeters that might have been left from a previous macro run with a different MIC_CONNECTORS constant
   // to prevent errors due to unhandled vuMeter events.
   xapi.Command.Audio.VuMeter.StopAll({ });
 
   // register callback for processing manual mute setting on codec
   xapi.Status.Audio.Microphones.Mute.on((state) => {
       console.log(`handleMicMuteResponse: ${state}`);
 
       if (state == 'On') {
           setTimeout(handleMicMuteOn, 2000);
       }
       else if (state == 'Off') {
             handleMicMuteOff();
       }
   });
 
 
   // register handler for Call Successful
   xapi.Event.CallSuccessful.on(async () => {
     startAutomation();
   });
 
   // register handler for Call Disconnect
   xapi.Event.CallDisconnect.on(async () => {
       stopAutomation();
   });
 
 }
 
 function handleMicMuteOn() {
   console.log('handleMicMuteOn');
   lastActiveHighInput = 0;
   lowWasRecalled = true;
   recallSideBySideMode();
 }
 
 function handleMicMuteOff() {
   console.log('handleMicMuteOff');
   // need to turn back on SpeakerTrack that might have been turned off when going on mute
   xapi.command('Cameras SpeakerTrack Activate').catch(handleError);
 }
 
 
 function handleError(error) {
   console.log(error);
 }
 
 
 
 function startAutomation() {
   console.log('startAutomation');
   manual_mode = false;
   allowCameraSwitching = true;
 
     // Always turn on SpeakerTrack when the Automation is started. It is also turned on when a call connects so that
     // if it is manually turned off while outside of a call it goes back to the correct state
    xapi.command('Cameras SpeakerTrack Activate').catch(handleError);
 
    //registering vuMeter event handler
    micHandler=xapi.event.on('Audio Input Connectors Microphone', (event) => {
         micArrays[event.id[0]].pop();
         micArrays[event.id[0]].push(event.VuMeter);
 
         // checking on manual_mode might be unnecessary because in manual mode,
         // audio events should not be triggered
         if (manual_mode==false)
         {
             // invoke main logic to check mic levels ans switch to correct camera input
             checkMicLevelsToSwitchCamera();
         }
     });
   // start VuMeter monitoring
   console.log("Turning on VuMeter monitoring...")
   for (var i in MIC_CONNECTORS) {
     xapi.command('Audio VuMeter Start', {
           ConnectorId: MIC_CONNECTORS[i],
           ConnectorType: 'Microphone',
           IntervalMs: 500,
           Source: 'AfterAEC'
     });
   }
 }
 
 function stopAutomation() {
          //setting overall manual mode to true
          manual_mode = true;
          console.log("Stopping all VuMeters...");
          xapi.Command.Audio.VuMeter.StopAll({ });
          console.log("Switching to MainVideoSource connectorID 1 ...");
          xapi.Command.Video.Input.SetMainVideoSource({ SourceId: 1});
          // using proper way to de-register handlers
          micHandler();
          micHandler= () => void 0;
 }
 
 
 
 
 
 function largestMicValue() {
   // figure out which of the inputs has the highest average level and return the corresponding key
  let currentMaxValue=0;
  let currentMaxKey='';
  let theAverage=0;
  for (var i in MIC_CONNECTORS){
     theAverage=averageArray(micArrays[MIC_CONNECTORS[i].toString()]);
     if (theAverage>=currentMaxValue) {
         currentMaxKey=MIC_CONNECTORS[i].toString();
         currentMaxValue=theAverage;
     }
  }
  return currentMaxKey;
 }
 
 
 function averageArray(arrayIn) {
   let sum = 0;
   for(var i = 0; i < arrayIn.length; i++) {
     sum = sum + parseInt( arrayIn[i], 10 );
   }
   let avg = (sum / arrayIn.length) * arrayIn.length;
   return avg;
 }
 
 function recallSideBySideMode() {
   if (overviewShowMultiple) {
         let connectorDict={ ConnectorId : [0,0]};
         connectorDict["ConnectorId"]=OVERVIEW_MULTIPLE_SOURCE_IDS;
         console.log("Trying to use this for connector dict in recallSideBySideMode(): ", connectorDict  )
         xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
         if(useDefaultPreset){
            xapi.command('Cameras SpeakerTrack Deactivate').catch(handleError);
            console.log("Trying to sets the cameras to their default position")
            OVERVIEW_MULTIPLE_SOURCE_IDS.forEach( camId => xapi.Command.Camera.Preset.ActivateDefaultPosition({ CameraId: camId }).catch(handleError) )
         }
     }
     else {
         let sourceDict={ SourceID : '0'};
         sourceDict["SourceID"]=OVERVIEW_SINGLE_SOURCE_ID.toString();
         console.log("Trying to use this for source dict in recallSideBySideMode(): ", sourceDict  )
         xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);
         if(useDefaultPreset){
            console.log("Trying to sets the camera to it's default position")
            xapi.Command.Camera.Preset.ActivateDefaultPosition({ CameraId: OVERVIEW_SINGLE_SOURCE_ID }).catch(handleError)
         }
     }
   lastActiveHighInput = 0;
   lowWasRecalled = true;
 }
 
 
 async function getPresetId(presetNumber){
   const res = await xapi.Command.Camera.Preset.List({})
   const presetObj = res.Preset.find(p => p.id === presetNumber.toString())
   if (!presetObj) throw new Error(`The preset n°${presetNumber} does not exist`)
   return presetObj.PresetId
 }
 
 
 function checkMicLevelsToSwitchCamera() {
   // make sure we've gotten enough samples from each mic in order to do averages
   if (allowCameraSwitching) {
          // figure out which of the inputs has the highest average level then perform logic for that input *ONLY* if allowCameraSwitching is true
           let array_key=largestMicValue();
           let array=[];
           array=micArrays[array_key];
           // get the average level for the currently active input
           let average = averageArray(array);
           //get the input number as an int since it is passed as a string (since it is a key to a dict)
           let input = parseInt(array_key);
           // someone is speaking
           if (average > MICROPHONEHIGH) {
             // start timer to prevent Side-by-Side mode too quickly
             restartSideBySideTimer();
             if (input > 0) {
               lowWasRecalled = false;
               // no one was talking before
               if (lastActiveHighInput === 0) {
                 makeCameraSwitch(input, average);
               }
               // the same person is talking
               else if (lastActiveHighInput === input) {
                 restartNewSpeakerTimer();
               }
               // a different person is talking
               else if (lastActiveHighInput !== input) {
                 if (allowNewSpeaker) {
                   makeCameraSwitch(input, average);
                 }
               }
             }
           }
           // no one is speaking
           else if (average < MICROPHONELOW) {
             // only trigger if enough time has elapsed since someone spoke last
             if (allowSideBySide) {
               if (input > 0 && !lowWasRecalled) {
                 lastActiveHighInput = 0;
                 lowWasRecalled = true;
                 console.log("-------------------------------------------------");
                 console.log("Low Triggered");
                 console.log("-------------------------------------------------");
                 recallSideBySideMode();
               }
             }
           }
 
   }
 }
 
 // function to actually switch the camera input
 async function makeCameraSwitch(input, average) {
   console.log("-------------------------------------------------");
   console.log("High Triggered: ");
   console.log(`Input = ${input} | Average = ${average}`);
   console.log("-------------------------------------------------");
    // turning back on SpeakerTrack on my codec in case it was turned off in side by side mode.
   xapi.command('Cameras SpeakerTrack Activate').catch(handleError);
    // Switch to the source that is speficied in the same index position in MAP_CAMERA_SOURCE_IDS
   let sourceDict={ SourceID : '0'}
   sourceDict["SourceID"]=MAP_CAMERA_SOURCE_IDS[MIC_CONNECTORS.indexOf(input)].toString();
   console.log("Trying to use this for source dict: ", sourceDict  )
   xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);
 
   // Get the preset ID that is speficied in the same index position in MAP_PRESET_NUMBERS
   const presetNumber = MAP_PRESET_NUMBERS[MIC_CONNECTORS.indexOf(input)];
 
   // If the preset number is not equal to 0 (so if there is a preset)
   if(presetNumber){
     const presetId = await getPresetId(presetNumber);
     xapi.command('Cameras SpeakerTrack Deactivate').catch(handleError);
     console.log("Trying to use preset ID: ", presetId  );
     xapi.Command.Camera.Preset.Activate({ PresetId: presetId });
   }
   
   lastActiveHighInput = input;
   restartNewSpeakerTimer();
 }
 
 
 /////////////////////////////////////////////////////////////////////////////////////////
 // VARIOUS TIMER HANDLER FUNCTIONS
 /////////////////////////////////////////////////////////////////////////////////////////
 
 function startSideBySideTimer() {
   if (sideBySideTimer == null) {
     allowSideBySide = false;
     sideBySideTimer = setTimeout(onSideBySideTimerExpired, SIDE_BY_SIDE_TIME);
   }
 }
 
 function stopSideBySideTimer() {
   if (sideBySideTimer != null) {
     clearTimeout(sideBySideTimer);
     sideBySideTimer = null;
   }
 }
 
 function restartSideBySideTimer() {
   stopSideBySideTimer();
   startSideBySideTimer();
 }
 
 function onSideBySideTimerExpired() {
   console.log('onSideBySideTimerExpired');
   allowSideBySide = true;
   recallSideBySideMode();
 }
 
 
 function startNewSpeakerTimer() {
   if (newSpeakerTimer == null) {
     allowNewSpeaker = false;
     newSpeakerTimer = setTimeout(onNewSpeakerTimerExpired, NEW_SPEAKER_TIME);
   }
 }
 
 function stopNewSpeakerTimer() {
   if (newSpeakerTimer != null) {
     clearTimeout(newSpeakerTimer);
     newSpeakerTimer = null;
   }
 }
 
 function restartNewSpeakerTimer() {
   stopNewSpeakerTimer();
   startNewSpeakerTimer();
 }
 
 function onNewSpeakerTimerExpired() {
   allowNewSpeaker = true;
 }
 
 /////////////////////////////////////////////////////////////////////////////////////////
 // INVOCATION OF INIT() TO START THE MACRO
 /////////////////////////////////////////////////////////////////////////////////////////
 
 init();
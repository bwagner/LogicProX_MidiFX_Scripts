//-----------------------------------------------------------------------------
// Midi Rotator ===================  24-JAN-2018
//
//	 	A Logic/MainStage MIDI FX 'Scripter' hack
// 		robbykilgore.com
// 		midirotator@gmail.com
//
//
//
// 		numVoices = The number of *additional* voices to add
//					Typically, the first is parallel
//					Voices > 1 are rotated
//
// 		rotor = Position of the rotor
//				Skips the parallel voice
// 				Rotates across voices: 2, 3, 4, 5
//
// 		velocity = velocity scaled between 0.01 to 1.00
//
//
//-----------------------------------------------------------------------------

// number of harmonies, also drives parameter creation. you can change pitches, then rerun script.
var pitches = [7, -10, -7, -8, -1];
var numVoices = pitches.length;
var count = 0;

// global object of active notes for record keeping
var activeNotes = {};

function makeNote(event, voice = null) {
  var note = new NoteOn(event);
  if (voice !== null) {
    note.pitch += GetParameter("Transposition " + voice);
    note.velocity = event.velocity * GetParameter("Velocity " + voice);
  }
  note.send();
  return note;
}

//-----------------------------------------------------------------------------
function HandleMIDI(event) {
  if (event instanceof NoteOn) {
    // create and send original note
    var events = [makeNote(event)];

    // create and send parallel voice
    // Note: Voice 1 is the parallel voice, which is not included in the rotation process.
    events.push(makeNote(event, 1));

    // create and send rotated voice
    // Adding 2, because index 0 is the original note, index 1 the parallel note
    // Subtracting 1 from numVoices, because the parallel note is excluded from rotation.
    var rotor = (count % (numVoices - 1)) + 2;
    events.push(makeNote(event, rotor));

    // store the list of all note events
    activeNotes[event.pitch] = events;
    count += 1;
  } else if (event instanceof NoteOff) {
    var events = activeNotes[event.pitch];
    if (events) {
      for (var note of events) {
        var noteOff = new NoteOff(note);
        noteOff.send();
      }
      delete activeNotes[event.pitch];
    }
  } else {
    event.send();
  }
}

//-----------------------------------------------------------------------------
// when a parameter changes, kill active note and send the new one
function ParameterChanged(param, value) {
  var voiceIndex = param % 2 === 0 ? param / 2 : (param - 1) / 2;

  for (var pitch in activeNotes) {
    var events = activeNotes[pitch];
    var voiceToChange = events[voiceIndex + 1];

    var noteOff = new NoteOff(voiceToChange);
    noteOff.send();

    if (param % 2 === 0) {
      voiceToChange.pitch = pitch + value;
    } else {
      voiceToChange.velocity = value;
    }

    voiceToChange.send();
  }
}

//-----------------------------------------------------------------------------
// Parameter Definitions

var PluginParameters = [];
for (var i = 0; i < numVoices; i++) {
  var voiceNumber = i + 1;
  PluginParameters.push({
    name: "Transposition " + voiceNumber,
    type: "lin",
    minValue: -24,
    maxValue: 24,
    numberOfSteps: 48,
    defaultValue: pitches[i % pitches.length],
  });

  PluginParameters.push({
    name: "Velocity " + voiceNumber,
    type: "lin",
    minValue: 0,
    maxValue: 1,
    numberOfSteps: 100,
    defaultValue: 1,
  });
}

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

var pitches = [7, -10, -7, -8, -1];
// number of harmonies, also drives parameter creation. you can change pitches, then rerun script.
var numVoices = pitches.length;
var count = 0;

// TODO: make a class

// global array of active notes for record keeping
var activeNotes = [];

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
    // store a copy for record keeping and send it
    var record = { originalPitch: event.pitch, events: [makeNote(event)] };

    // create a parallel copy of the note on and apply parameters
    // Note: Voice 1 is the parallel voice, which is not included in the rotation process.
    record.events.push(makeNote(event, 1));

    // harmonize
    // Adding 2, because index 0 is the original note, index 1 the parallel note
    // Subtracting 1 from voices, because the parallel note is excluded from rotation.
    var rotor = (count % (numVoices - 1)) + 2;
    record.events.push(makeNote(event, rotor));

    // put the record of all harmonies in activeNotes array
    activeNotes.push(record);
    count += 1;
  } else if (event instanceof NoteOff) {
    // find a match for the note off in our activeNotes record
    for (var i in activeNotes) {
      if (activeNotes[i].originalPitch == event.pitch) {
        // send note offs for each note stored in the record
        for (var j = 0; j < activeNotes[i].events.length; j++) {
          var noteOff = new NoteOff(activeNotes[i].events[j]);
          noteOff.send();
        }

        // remove the record from activeNotes
        activeNotes.splice(i, 1);
        break;
      }
    }
  }

  // pass non-note events through
  else {
    event.send();
  }
}

//-----------------------------------------------------------------------------
// when a parameter changes, kill active note and send the new one
function ParameterChanged(param, value) {
  // which voice is it?
  var voiceIndex = param % 2 == 0 ? param / 2 : (param - 1) / 2;

  for (var i in activeNotes) {
    var voiceToChange = activeNotes[i].events[voiceIndex + 1];

    // send note off
    var noteOff = new NoteOff(voiceToChange);
    noteOff.send();

    // modify according to param change
    if (param % 2 == 0)
      voiceToChange.pitch = activeNotes[i].originalPitch + value;
    else voiceToChange.velocity = value;

    // send
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

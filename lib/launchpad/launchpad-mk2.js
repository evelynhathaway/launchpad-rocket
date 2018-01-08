/*
	Module: Launchpad MK2
	Description: Class for the Launchpad MK2 device
	TODO:
		send
			light column
				sysex: 12, column, color
			light row
				sysex: 13, row, color
			change layout
				sysex: 34, layout
			initialize fader
				sysex: 43, number, type, color, value
		receive
			press
				message: header, note, 127
			release
				message: header, note, 0
*/
/*
	Module dependencies
*/
// lodash
const _ = require("lodash");
// Core
const core = require("../core.js");


/*
	Code sharing
*/
// Launchpad - parent device class
const Launchpad = require("./launchpad-base.js");
// Button - button class
const Button = require("./button/launchpad-mk2.js");
// All supported shared methods
const supports = ["rgb", "scroll-text", "midi-clock", "layout"];
const instanceMethods = core.requireShared(
	// All supported methods
	supports,
	// Path to find those methods
	"./launchpad/methods/"
);
const classMethods = core.requireShared(
	// All supported methods
	supports,
	// Path to find those methods
	"./launchpad/methods/static-"
);


/*
	Launchpad MK2 Class
*/
class LaunchpadMk2 extends Launchpad {
	constructor() {
		// Launchpad, Device, EventEmitter
		super(...arguments);

		// Shared instance methods
		core.addShared(this, instanceMethods);
	}


	// TODO: share between devices
	setToBootloader() {
		// Send with default manufacturer ID using undefined and empty the model ID using []
		return this.sendSysEx([0, 113, 0, 105], undefined, []);
	}
	// TODO: share between devices
	// TODO: return correct information according to the reference
	async deviceInquiry(deviceId = this.deviceId - 1) {
		// The IDs are zero indexed in this case (0 - 15 inclusive)
		// 127 can be used to have all respond regardless of ID
		if (!_.inRange(deviceId, 0, 16) && deviceId !== 127) {
			throw new RangeError(`Device ID ${deviceId} is not between 0 and 15 or 127.`);
		}

		// Return a matching part of a message
		const template = new RegExp("240, 126, 0, 6, 2, ([\\d,\\s]*?), 247");
		const response = this.resolveForResponse(template);

		// Send with empty manufacturer ID and model ID using []
		this.sendSysEx([126, deviceId, 6, 1], [], []);

		return await response;
	}
	// TODO: share between devices
	// TODO: return correct information according to the reference
	async versionInquiry() {
		// Return a matching part of a message
		const template = new RegExp(`240, ${this.constructor.sysExManufacturerId.join(", ")}, 0, 112, ([\\d,\\s]*?), 247`);
		const response = this.resolveForResponse(template);

		// Send with default manufacturer ID using undefined and empty the model ID using []
		this.sendSysEx([0, 112], undefined, []);

		return await response;
	}


	// Get device id (1 - 16, set in bootloader) TODO: share between devices
	get deviceId() {
		const deviceName = core.getDeviceName(
			this.input,
			this.output,
			this.portNums.input,
			this.portNums.output
		);
		const match = deviceName.match(/^(?:(\d+)-?\s+)?.*?(?:\s+(\d+))?$/);
		if (match && match[1]) {
			// Example: "6- Launchpad MK2" means the device ID is 1
			return 1;
		} else if (match && match[2]) {
			// Example: "Launchpad MK2 5" means the device ID is 5
			return parseInt(match[2]);
		} else {
			// Can't find value in device name, default to 1
			return 1;
		}
	}


	// Layouts regex smart getter
	static get layouts() {
		delete this.layouts;
		return this.layouts = [
			/Session/i,
			/User 1|Drum Rack/i,
			/User 2/i,
			/Reserved|Ableton|Live/i,
			/Fader/i,
			/Pan/i
		];
	}
	// Button values smart getter
	static get values() {
		const values = [];
		const range = _.range(0, 8);

		// Top
		const topNames = ["up", "down", "left", "right", "session", "user 1", "user 2", "mixer"];
		for (const x of range) {
			values.push({
				"name": topNames[x],
				"group": "top",
				"status": "control change",
				"column": x,
				"row": 8,
				"note": 104 + x
			});
		}
		// Right
		const rightNames = ["record arm", "solo", "mute", "stop", "send b", "send a", "pan", "volume"];
		for (const y of range) {
			values.push({
				"name": rightNames[y],
				"group": "right",
				"status": "note on",
				"column": 8,
				"row": y,
				"note": (10 * y)  + 19
			});
		}
		// Grid
		for (const x of range) {
			for (const y of range) {
				// Quadrant
				let quadrant = 0;
				if (x > 3) {
					quadrant += 1;
				}
				if (y > 3) {
					quadrant += 2;
				}

				// Push to values
				values.push({
					"status": "note on",
					"group": "grid",
					"column": x,
					"row": y,
					quadrant,
					"note": (10 * y) + x + 11
				});
			}
		}

		delete this.values;
		return this.values = values;
	}
	// The button class to use for this device
	static get Button() {
		return Button;
	}
	static get sysExModelId() {
		return [
			// Product type
			2,
			// Product number
			24
		];
	}
	static get name() {
		return "Launchpad MK2";
	}
	static get regex() {
		return `^(?:\\d+-?\\s+)?(${this.name})(?:\\s+\\d+)?$`;
	}
	static is(object) {
		return object instanceof this;
	}
}


// Export class with shared static methods
module.exports = core.addShared(LaunchpadMk2, classMethods);
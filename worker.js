
// Zlip compiled via emscripten
importScripts('./vendor/zee.js');

onmessage = function(msg) {
	'use strict';

	// Do timing
	var start = Date.now();

	// Process our input of type arrayBuffer in our
	var data = Zee.decompress(new Uint8Array(msg.data.input));
	// data instanceof Uint8Array === true

	postMessage({
		id: msg.data.id, // When converting more songs, track them
		output: data.buffer, // ArrayBuffer are transferable
		time: Date.now() - start
	}, [data.buffer]);
};

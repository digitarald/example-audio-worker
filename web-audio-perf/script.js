(function() {
	'use strict';

	var trackBuffer = new ArrayBuffer(0);
	var chunks = [];
	var currentSource = null;
	var bufferSize = 10240;
	var startTime = null;

	var AudioContext = window.AudioContext || window.webkitAudioContext;
	var context = new AudioContext();

	function init() {
		$play.textContent = 'Loading ...';
		loadArrayBuffer('./../playlist/piano-1-full.ogg', function(buffer) {
			for (var i = 0, l = buffer.byteLength; i < l; i += bufferSize) {
				chunks.push(buffer.slice(i, i + bufferSize));
			}

			$play.textContent = 'Playing';
			$log.textContent = chunks.length + ' chunks ready!';

			// Simulate chunked loading with timeout
			chunks.forEach(function(chunk, i) {
				setTimeout(function() {
					appendChunk(chunk, function(duration) {
						duration = Math.round(duration);
						$log.textContent = 'Chunk ' + i + ' added, ' + duration +'sec\n' + $log.textContent;
					});
				}, i * 750);
			})
		});
	}

	/**
	 * Interface
	 */

	var $play = document.getElementById('play');
	$play.onclick = init;

	var $time = document.getElementById('time');
	var $log = document.getElementById('log');

	function tick() {
		if (startTime != null) {
			$time.value = Math.round((context.currentTime - startTime) * 10) / 10;
		}
		requestAnimationFrame(tick);
	}
	requestAnimationFrame(tick);

	/**
	 * Audio
	 */

	function loadArrayBuffer(url, next) {
		console.log('Request %s', url);
		var request = new XMLHttpRequest();
		request.open('GET', url, true);
		request.responseType = 'arraybuffer';

		request.onprogress = function() {
			try {
				var response = request.response || request.responseText;
				if (response) {
					console.log(response.length);
				}
			} catch (e) {}
		}
		//
		request.onload = function() {
			next(request.response);
			request = null;
		}
		request.send();
	}

	/**
	 * Append new chunks to a new source and stop previous source
	 */
	function appendChunk(chunk, next) {
		if (!chunk || !chunk.byteLength) {
			throw new Error('No chunk!');
		}
		// console.log('Appending buffer: %d + %d', trackBuffer.byteLength, chunk.byteLength);

		trackBuffer = concatBuffers(trackBuffer, chunk);

		context.decodeAudioData(trackBuffer, function(audioBuffer) {
			if (startTime == null) {
				startTime = context.currentTime;
			}
			var duration = audioBuffer.duration;
			if (!duration) {
				throw new Error('No duration!');
			}

			var currentTime = context.currentTime;
			var time = currentTime;
			var offset = currentTime - startTime;

			console.log('Appending chunk with offset %f', offset);

			var audioSource = context.createBufferSource();
			audioSource.connect(context.destination);

			audioSource.buffer = audioBuffer;
			audioSource.start(time, offset);

			if (currentSource) {
				currentSource.stop();
			}
			currentSource = audioSource;
			next(duration);
		});
	}

	// The unavoidable utils section

	// A quick and easy way to append chunks
	function concatBuffers(a, b) {
		var result = new Uint8Array(a.byteLength + b.byteLength);
		result.set(new Uint8Array(a), 0);
		result.set(new Uint8Array(b), a.byteLength);
		return result.buffer;
	}

})();
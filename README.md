# Audio Worker Example

Showcasing

 * Request a packaged audio file (XHR2 + ArrayBuffer)
 * Transfer to a worker for processing (Transferable Objects)
 * Unpack it on worker (Emscripten + Typed Arrays)
 * Play it. (HTML5 Audio)

Use cases:

 * DRM and other decryption algorithms
 * Decoding audio files
 * Processing/scaling images
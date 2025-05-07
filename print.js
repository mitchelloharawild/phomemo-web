/*
* Adapted from https://gist.github.com/bdm-k/fe903491a051251db688866b7d554065
*/

// print configuration
const darkness = 0x08 // range: 0x01 - 0x0f
const speed = 0x05 // range: 0x01 - 0x05
const paperType = 0x0a // Mode: 0a="Label With Gaps" 0b="Continuous" 26="Label With Marks"
const markOffset = 25 // margin-top for printing when paperType === 0x26

let array = null

let serialPort = null

async function openSerialPort() {
  if (serialPort) {
    console.error(
      "openSerialPort: There is an open serial port. Close it with 'closeSerialPort'"
    )
    return false
  }

  const navigator = window.navigator

  try {
    serialPort = await navigator.serial.requestPort()
    await serialPort.open({ baudRate: 128000 })
    return true
  } catch (e) {
    console.error("openSerialPort:", e)
    serialPort = null
    return false
  }
}

async function closeSerialPort() {
  if (!serialPort) {
    console.log("closeSerialPort: No open serial port")
    return
  }

  await serialPort.close()
  serialPort = null
}

async function printImage(canvas) {
  if (!serialPort) {
    console.error("No device connected, please connect to the printer first.");
    return false;
  }

  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Calculate dimensions for the array
  const arrayWidth = Math.ceil(imageData.width / 8); // Ensure full coverage
  const arrayHeight = imageData.height;
  const array = new Uint8Array(arrayWidth * arrayHeight);
  array.fill(0x00);

  // Convert image data to the printer's format
  for (let y = 0; y < imageData.height; ++y) {
    for (let x = 0; x < imageData.width; ++x) {
      const imageDataIndex = (y * imageData.width + x) * 4;
      const r = imageData.data[imageDataIndex];
      const g = imageData.data[imageDataIndex + 1];
      const b = imageData.data[imageDataIndex + 2];

      // If the pixel is considered black
      if (r < 0x80 && g < 0x80 && b < 0x80) {
        const byteIndex = Math.floor(x / 8);
        const bitIndex = x % 8;
        array[y * arrayWidth + byteIndex] |= (0x80 >> bitIndex);
      }
    }
  }

  const HEADER = new Uint8Array([
    0x1b, 0x4e, 0x0d, speed,
    0x1b, 0x4e, 0x04, darkness,
    0x1f, 0x11, paperType
  ]);
  const BLOCK_MARKER = new Uint8Array([
    0x1d, 0x76, 0x30, 0x00,
    arrayWidth & 0xff, // Low byte of width in bytes
    arrayWidth >> 8, // High byte of width in bytes
    arrayHeight & 0xff, // Low byte of height
    arrayHeight >> 8 // High byte of height
  ]);
  const FOOTER = new Uint8Array([
    0x1f, 0xf0, 0x05, 0x00,
    0x1f, 0xf0, 0x03, 0x00
  ]);

  try {
    const writer = serialPort.writable.getWriter();

    await writer.write(HEADER);
    await writer.write(BLOCK_MARKER);
    await writer.write(array);
    await writer.write(FOOTER);

    await writer.close()

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

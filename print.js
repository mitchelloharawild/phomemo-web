/*
* Adapted from https://gist.github.com/bdm-k/fe903491a051251db688866b7d554065
*/

// print configuration
const darkness = 0x08 // range: 0x01 - 0x0f
const speed = 0x05 // range: 0x01 - 0x05
const paperType = 0x26 // Mode: 0a="Label With Gaps" 0b="Continuous" 26="Label With Marks"
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
    console.error(
      "No device connected, please connect to the printer first."
    )
    return false
  }

  // Decode the image using canvas
  const ctx = canvas.getContext("2d")
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Convert the image to a Uint8Array in the format that Phomemo M110 accepts
  const arrayDim = [Math.floor((imageData.width+7)/8), imageData.height+markOffset]
  array = new Uint8Array(arrayDim[0] * arrayDim[1])
  array.fill(0x00)
  for (let y = markOffset; y < imageData.height; ++y)
    for (let x = 0; x < imageData.width; ++x) {
      const imageDataIndex = (y-markOffset) * 4 * imageData.width + 4 * x
      const r = imageData.data[imageDataIndex]
      const g = imageData.data[imageDataIndex + 1]
      const b = imageData.data[imageDataIndex + 2]

      // if black
      if (r < 0x80 && g < 0x80 && b < 0x80) {
        const arrayX = x
        const arrayY = y
        const bitOffset = arrayX % 8
        const arrayIndex = arrayY * arrayDim[0] + (arrayX - bitOffset) / 8
        array[arrayIndex] += 1 << (7 - bitOffset)
      }
    }

  const HEADER = new Uint8Array([
    0x1b, 0x4e, 0x0d, speed,
    0x1b, 0x4e, 0x04, darkness,
    0x1f, 0x11, paperType
  ])
  const BLOCK_MARKER = new Uint8Array([
    0x1d, 0x76,
    0x30, 0x00,
    arrayDim[0],
    0x00,
    arrayDim[1],
    0x00
  ])
  const FOOTER = new Uint8Array([
    0x1f, 0xf0, 0x05, 0x00,
    0x1f, 0xf0, 0x03, 0x00
  ])

  try {
    const writer = serialPort.writable.getWriter()

    await writer.write(HEADER)
    await writer.write(BLOCK_MARKER)
    await writer.write(array)
    await writer.write(FOOTER)

    await writer.close()

    return true
  } catch (e) {
    console.error(e)
    return false
  }
}

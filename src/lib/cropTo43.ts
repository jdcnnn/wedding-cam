export async function cropTo43(
  bitmap: ImageBitmap,
  {
    maxLongSide = 3200,
    maxQuality = 0.94,
    minQuality = 0.90,
    targetMaxBytes = 1_800_000,
    maxResolutionSteps = 3,
    mirror = false,
  }: {
    maxLongSide?: number
    maxQuality?: number
    minQuality?: number
    targetMaxBytes?: number
    maxResolutionSteps?: number
    mirror?: boolean
  } = {}
): Promise<Blob> {
  const srcW = bitmap.width
  const srcH = bitmap.height

  let cropW: number
  let cropH: number

  if (srcW >= srcH) {
    cropH = srcH
    cropW = Math.round(srcH * (3 / 4))
    if (cropW > srcW) {
      cropW = srcW
      cropH = Math.round(srcW * (4 / 3))
    }
  } else {
    cropW = srcW
    cropH = Math.round(srcW * (4 / 3))
    if (cropH > srcH) {
      cropH = srcH
      cropW = Math.round(srcH * (3 / 4))
    }
  }

  const offsetX = Math.round((srcW - cropW) / 2)
  const offsetY = Math.round((srcH - cropH) / 2)

  const longSide = Math.max(cropW, cropH)
  const scale = longSide > maxLongSide ? maxLongSide / longSide : 1

  let targetW = Math.round(cropW * scale)
  let targetH = Math.round(cropH * scale)

  const drawAndEncode = (w: number, h: number, q: number): Promise<Blob> => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (mirror) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(bitmap, offsetX, offsetY, cropW, cropH, 0, 0, w, h)

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob failed'))
        },
        'image/jpeg',
        q,
      )
    })
  }

  let resolutionStep = 0
  let blob: Blob

  while (true) {
    let q = maxQuality
    blob = await drawAndEncode(targetW, targetH, q)

    while (blob.size > targetMaxBytes && q > minQuality) {
      q = Math.max(minQuality, q - 0.02)
      blob = await drawAndEncode(targetW, targetH, q)
    }

    if (blob.size <= targetMaxBytes) break
    if (resolutionStep >= maxResolutionSteps) break

    resolutionStep++
    targetW = Math.round(targetW * 0.9)
    targetH = Math.round(targetH * 0.9)
  }

  return blob
}
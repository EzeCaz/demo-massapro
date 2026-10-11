'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PenTool, Eraser, Upload, Download, Check, X } from 'lucide-react'

const ORCHID = '#7F39FB'
const JET = '#0A0711'
const LAVENDER = '#E9D5FF'

interface SignaturePadProps {
  value: string | null  // current signature as a base64 data URL (or null)
  onChange: (signature: string | null) => void
  label?: string
  disabled?: boolean
}

// SignaturePad — a hand-drawing canvas + image upload component for
// e-signatures. The user can:
//   1. Draw their signature with a mouse/touch/stylus on the canvas
//   2. Upload a signature image (PNG/JPG) as an alternative
//   3. Clear the canvas and start over
//   4. Confirm the signature (exports the canvas as a PNG data URL)
//
// The resulting signature is stored as a base64 PNG data URL, which can be:
//   - Saved in the NDA payload (payload.signatures[role].image)
//   - Rendered in the Word/PDF exports as an ImageRun/doc.image
//   - Displayed in the admin NDA list as an <img>
export default function SignaturePad({ value, onChange, label, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [mode, setMode] = useState<'draw' | 'image'>(value ? 'image' : 'draw')

  // Initialize the canvas with a white background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // Draw a subtle baseline guide
    ctx.strokeStyle = '#E9D5FF'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(20, canvas.height - 20)
    ctx.lineTo(canvas.width - 20, canvas.height - 20)
    ctx.stroke()
    ctx.setLineDash([])
  }, [])

  // Get the pointer position relative to the canvas
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.strokeStyle = JET
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setIsDrawing(true)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.releasePointerCapture(e.pointerId)
    setIsDrawing(false)
  }

  // Clear the canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // Redraw the baseline guide
    ctx.strokeStyle = '#E9D5FF'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(20, canvas.height - 20)
    ctx.lineTo(canvas.width - 20, canvas.height - 20)
    ctx.stroke()
    ctx.setLineDash([])
    setHasDrawn(false)
    onChange(null)
  }, [onChange])

  // Confirm the drawing — export the canvas as a PNG data URL
  const confirmDrawing = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) return
    // Trim whitespace around the signature by finding the bounding box of
    // non-white pixels, then cropping the canvas to that box.
    const dataUrl = canvas.toDataURL('image/png')
    onChange(dataUrl)
  }, [hasDrawn, onChange])

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2_000_000) {
      alert('Image too large. Please upload an image under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      onChange(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = '' // reset so the same file can be selected again
  }

  // If a signature value already exists (e.g., loaded from the platform),
  // show it as a preview image instead of the canvas.
  if (value && mode === 'image') {
    return (
      <div className="space-y-2">
        {label && <Label className="text-xs" style={{ color: JET }}>{label}</Label>}
        <div className="rounded-lg border-2 p-3" style={{ borderColor: LAVENDER, background: '#fff' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Signature"
            className="max-h-24 mx-auto object-contain"
          />
        </div>
        {!disabled && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setMode('draw'); clearCanvas() }}
              style={{ borderColor: ORCHID, color: ORCHID }}
            >
              <PenTool className="h-4 w-4 mr-1.5" />
              Redraw
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { onChange(null); setMode('draw') }}
              style={{ borderColor: '#EF4444', color: '#EF4444' }}
            >
              <X className="h-4 w-4 mr-1.5" />
              Remove
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs" style={{ color: JET }}>{label}</Label>}

      {/* Drawing canvas */}
      <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: LAVENDER, background: '#fff' }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full touch-none cursor-crosshair"
          style={{ display: 'block' }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={stopDraw}
          onPointerCancel={stopDraw}
          onPointerLeave={stopDraw}
        />
      </div>

      {/* Drawing controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={confirmDrawing}
          disabled={!hasDrawn || disabled}
          style={{ borderColor: '#10B981', color: '#10B981' }}
        >
          <Check className="h-4 w-4 mr-1.5" />
          Confirm Drawing
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={clearCanvas}
          disabled={disabled}
          style={{ borderColor: '#EF4444', color: '#EF4444' }}
        >
          <Eraser className="h-4 w-4 mr-1.5" />
          Clear
        </Button>
        <label
          className="inline-flex items-center gap-1.5 cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-opacity-80"
          style={{ borderColor: ORCHID, color: ORCHID, background: LAVENDER }}
        >
          <Upload className="h-4 w-4" />
          Upload Image
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleImageUpload}
            disabled={disabled}
          />
        </label>
      </div>
      <p className="text-xs" style={{ color: JET, opacity: 0.6 }}>
        Draw your signature above with a mouse, touch, or stylus, then click "Confirm Drawing". Or upload a signature image (PNG/JPG, under 2 MB).
      </p>
    </div>
  )
}

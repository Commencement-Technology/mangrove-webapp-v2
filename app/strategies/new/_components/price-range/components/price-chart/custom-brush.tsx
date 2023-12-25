"use client"

import { cn } from "@/utils"
import { type ScaleLinear } from "d3-scale"
import React, { useEffect, useRef, useState } from "react"
import Cursor from "./cursor"

type SelectionStatus = "idle" | "start" | "end"

interface CustomBrushProps {
  xScale: ScaleLinear<number, number>
  width: number
  height: number
  onBrushEnd: (range: [number, number]) => void
  value?: [number, number]
  onBrushChange: (newRange: [number, number]) => void
  svgRef: React.RefObject<SVGSVGElement>
}

function CustomBrush({
  xScale,
  width,
  height,
  onBrushEnd,
  value,
  onBrushChange,
  svgRef,
}: CustomBrushProps) {
  const startValueRef = useRef<number | null>(null)
  const [selection, setSelection] = useState<[number, number] | null>(
    value ?? null,
  )
  const [selectionStatus, setSelectionStatus] =
    useState<SelectionStatus>("idle")
  const [dragging, setDragging] = useState(false)
  const [dragMode, setDragMode] = useState(false)

  // Update selection when value prop changes
  useEffect(() => {
    setSelection(value ?? null)
  }, [value])

  const handleMouseDown = React.useCallback(
    (event: MouseEvent) => {
      const svg = svgRef.current
      if (svg) {
        const svgRect = svg.getBoundingClientRect()
        let xPixel = event.clientX - svgRect.left
        xPixel = Math.max(0, Math.min(width, xPixel))
        const x = xScale.invert(xPixel)
        if (xPixel >= 0 && xPixel <= width) {
          if (selection && x >= selection[0] && x <= selection[1]) {
            setDragging(true)
            setDragMode(true)
            startValueRef.current = x - selection[0]
          } else if (!selection) {
            startValueRef.current = x
            setSelectionStatus("start")
            setSelection([x, x])
            setDragMode(false)
          }
        }
      }
    },
    [selection, svgRef, width, xScale],
  )

  const handleMouseMove = React.useCallback(
    (event: MouseEvent) => {
      const svg = svgRef.current
      if (svg) {
        const svgRect = svg.getBoundingClientRect()
        const xPixel = event.clientX - svgRect.left
        const x = xScale.invert(xPixel)
        if (
          dragging &&
          dragMode &&
          selection &&
          startValueRef.current !== null
        ) {
          const dx = x - startValueRef.current
          setSelection([dx, dx + (selection[1] - selection[0])]) // apply the offset
        } else if (
          !dragMode &&
          startValueRef.current !== null &&
          event.buttons !== 0 &&
          selectionStatus !== "end"
        ) {
          setSelection([startValueRef.current, x])
        }
      }
    },
    [svgRef, xScale, dragging, dragMode, selection, selectionStatus],
  )

  const handleMouseUp = React.useCallback(() => {
    setDragging(false)
    setSelectionStatus("end")
    if (selection !== null && onBrushEnd) {
      onBrushEnd(selection.sort((a, b) => a - b) as [number, number])
    }
  }, [onBrushEnd, selection])

  const handleCursorMove = (type: "left" | "right", newXPosition: number) => {
    if (!selection) return
    const newPrice = xScale.invert(newXPosition)
    if (type === "left") {
      const newSelection: [number, number] = [newPrice, selection[1]]
      console.log("left", newSelection)
      setSelection(newSelection)
      onBrushChange(newSelection)
    } else {
      const newSelection: [number, number] = [selection[0], newPrice]
      console.log("right", newSelection)
      setSelection(newSelection)
      onBrushChange(newSelection)
    }
  }

  useEffect(() => {
    if (value) {
      setSelection(value)
    }
  }, [value, xScale])

  useEffect(() => {
    const svg = svgRef.current
    svg?.addEventListener("mousedown", handleMouseDown)
    svg?.addEventListener("mousemove", handleMouseMove)
    svg?.addEventListener("mouseup", handleMouseUp)

    return () => {
      svg?.removeEventListener("mousedown", handleMouseDown)
      svg?.removeEventListener("mousemove", handleMouseMove)
      svg?.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, svgRef])

  const brushWidth = selection
    ? Math.abs(xScale(selection[1]) - xScale(selection[0]))
    : 0
  const brushX = selection
    ? Math.min(xScale(selection[0]), xScale(selection[1]))
    : 0

  const leftCursorPos = selection ? xScale(selection[0]) : 0
  const rightCursorPos = selection ? xScale(selection[1]) : 0

  return (
    <>
      {selection && (
        <rect
          x={brushX}
          y={0}
          width={brushWidth}
          height={height}
          fill="hsla(0, 100%, 68%, 0.1)"
          className={cn({
            "cursor-grab": !dragging,
            "cursor-grabbing": dragging,
          })}
        />
      )}
      {selection && (
        <>
          <Cursor
            height={height}
            xPosition={leftCursorPos}
            color="green"
            type="left"
            onMove={(newXPosition) => handleCursorMove("left", newXPosition)}
            xScale={xScale}
          />
          <Cursor
            height={height}
            xPosition={rightCursorPos}
            color="red"
            type="right"
            onMove={(newXPosition) => handleCursorMove("right", newXPosition)}
            xScale={xScale}
          />
        </>
      )}
    </>
  )
}

export default CustomBrush

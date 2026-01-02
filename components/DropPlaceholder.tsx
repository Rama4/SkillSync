"use client"

import { useRef } from "react"
import { useDrop } from "react-dnd"
import { cn } from "@/lib/utils"

interface DropPlaceholderProps {
  lessonId: string
  index: number
  onDrop: (draggedNoteId: string, targetIndex: number) => void
  acceptFromSameLesson?: boolean
}

const ITEM_TYPE = "NOTE"

export default function DropPlaceholder({
  lessonId,
  index,
  onDrop,
  acceptFromSameLesson = true,
}: DropPlaceholderProps) {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ITEM_TYPE,
      drop: (item: { id: string; lessonId: string; index: number }) => {
        if (acceptFromSameLesson || item.lessonId !== lessonId) {
          onDrop(item.id, index)
        }
      },
      canDrop: (item: { id: string; lessonId: string; index: number }) => {
        if (item.lessonId !== lessonId) return true
        if (!acceptFromSameLesson) return false
        // Allow dropping at any position except the exact same position
        return item.index !== index
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [lessonId, index, onDrop, acceptFromSameLesson],
  )

  drop(ref)

  return (
    <div
      ref={ref}
      className={cn(
        "h-2 transition-all rounded my-1",
        canDrop && "h-10 border-2 border-dashed",
        isOver && canDrop && "border-primary bg-primary/10",
        canDrop && !isOver && "border-muted-foreground/30 bg-muted/20",
      )}
    />
  )
}

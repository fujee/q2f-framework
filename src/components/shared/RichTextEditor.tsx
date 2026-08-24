import { useEffect, useRef } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ToolbarButtonProps {
  label: string
  onClick: () => void
  children: React.ReactNode
}

function ToolbarButton({ label, onClick, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()} // keep the editor focused
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** Minimal mode: inline formatting only (no headings/lists). */
  minimal?: boolean
  className?: string
}

/**
 * Dependency-free rich text (HTML) editor built on `contentEditable`.
 * Produces/stores HTML strings suitable for question descriptions.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minimal,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Sync external value changes (e.g. store hydration) without clobbering focus.
  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) {
      el.innerHTML = value
    }
  }, [value])

  const exec = (command: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    onChange(ref.current?.innerHTML ?? '')
  }

  const isEmpty =
    !value || value === '<br>' || value === '<p></p>' || value === '<div></div>'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border bg-background transition-colors focus-within:ring-1 focus-within:ring-ring',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1">
        <ToolbarButton label="Bold" onClick={() => exec('bold')}>
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec('italic')}>
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec('underline')}>
          <Underline className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          onClick={() => exec('strikeThrough')}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>
        {!minimal && (
          <>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <ToolbarButton
              label="Heading"
              onClick={() => exec('formatBlock', 'h2')}
            >
              <Heading2 className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="Bullet list"
              onClick={() => exec('insertUnorderedList')}
            >
              <List className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="Numbered list"
              onClick={() => exec('insertOrderedList')}
            >
              <ListOrdered className="size-3.5" />
            </ToolbarButton>
          </>
        )}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          'rich-text-content min-h-[2.5rem] px-3 py-2 text-sm outline-none',
          minimal && 'min-h-[2.25rem]',
          isEmpty && 'rich-text-empty'
        )}
        onInput={() => onChange(ref.current?.innerHTML ?? '')}
      />
    </div>
  )
}

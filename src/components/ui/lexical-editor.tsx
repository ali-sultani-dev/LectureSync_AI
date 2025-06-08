'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  $getSelection,
  $isRangeSelection,
  EditorState,
  LexicalEditor as LexicalEditorType,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  $createParagraphNode,
} from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import {
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import {
  ListItemNode,
  ListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from '@lexical/list'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { TRANSFORMERS } from '@lexical/markdown'
import { $setBlocksType, $patchStyleText } from '@lexical/selection'
import { mergeRegister } from '@lexical/utils'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bold, Italic, Underline, List, ListOrdered, Quote, Undo2, Redo2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'text-muted-foreground',
  paragraph: 'mb-1',
  quote: 'border-l-4 border-muted pl-4 italic text-muted-foreground my-2',
  heading: {
    h1: 'text-2xl font-bold mb-2 mt-4',
    h2: 'text-xl font-semibold mb-2 mt-3',
    h3: 'text-lg font-medium mb-1 mt-2',
  },
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal list-inside my-2',
    ul: 'list-disc list-inside my-2',
    listitem: 'mb-1',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
    code: 'bg-muted px-1 py-0.5 rounded text-sm font-mono',
  },
  code: 'bg-muted p-2 rounded font-mono text-sm my-2',
  codeHighlight: {
    atrule: 'text-purple-600',
    attr: 'text-blue-600',
    boolean: 'text-red-600',
    builtin: 'text-purple-600',
    cdata: 'text-gray-600',
    char: 'text-green-600',
    class: 'text-blue-600',
    'class-name': 'text-blue-600',
    comment: 'text-gray-500',
    constant: 'text-red-600',
    deleted: 'text-red-600',
    doctype: 'text-gray-600',
    entity: 'text-orange-600',
    function: 'text-purple-600',
    important: 'text-red-600',
    inserted: 'text-green-600',
    keyword: 'text-purple-600',
    namespace: 'text-blue-600',
    number: 'text-red-600',
    operator: 'text-gray-600',
    prolog: 'text-gray-600',
    property: 'text-blue-600',
    punctuation: 'text-gray-600',
    regex: 'text-green-600',
    selector: 'text-green-600',
    string: 'text-green-600',
    symbol: 'text-red-600',
    tag: 'text-red-600',
    url: 'text-blue-600',
    variable: 'text-orange-600',
  },
}

const blockTypeToBlockName = {
  paragraph: 'Normal',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  quote: 'Quote',
  bullet: 'Bulleted List',
  number: 'Numbered List',
}

function onError(error: Error) {
  console.error(error)
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [blockType, setBlockType] = useState('paragraph')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Update toolbar state on selection change
  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      // Block type
      const anchorNode = selection.anchor.getNode()
      let element =
        anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow()
      if ($isListNode(element)) {
        setBlockType(element.getListType())
      } else if ($isHeadingNode(element)) {
        setBlockType(element.getTag())
      } else {
        setBlockType(element.getType())
      }
    }
  }, [])

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar()
          return false
        },
        1,
      ),
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar()
        })
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload)
          return false
        },
        1,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload)
          return false
        },
        1,
      ),
    )
  }, [editor, updateToolbar])

  // Formatting handlers
  const formatBold = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
  }, [editor])
  const formatItalic = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
  }, [editor])
  const formatUnderline = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
  }, [editor])
  const formatHeading = useCallback(
    (headingSize: any) => {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize))
        }
      })
    },
    [editor],
  )
  const formatParagraph = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }, [editor])
  const formatQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }, [editor])
  const formatBulletList = useCallback(() => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
  }, [editor])
  const formatNumberedList = useCallback(() => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
  }, [editor])
  const removeList = useCallback(() => {
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
  }, [editor])

  // Block type dropdown handler
  const handleBlockTypeChange = (value: any) => {
    switch (value) {
      case 'paragraph':
        formatParagraph()
        break
      case 'h1':
      case 'h2':
      case 'h3':
        formatHeading(value)
        break
      case 'quote':
        formatQuote()
        break
      case 'bullet':
        formatBulletList()
        break
      case 'number':
        formatNumberedList()
        break
      default:
        break
    }
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1" />
      {/* Block type dropdown */}
      <Select value={blockType} onValueChange={handleBlockTypeChange}>
        <SelectTrigger className="w-36 h-8">
          <SelectValue placeholder="Block Type" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(blockTypeToBlockName).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Separator orientation="vertical" className="h-6 mx-1" />
      {/* Formatting toggles */}
      <Toggle
        aria-label="Bold"
        pressed={isBold}
        onPressedChange={formatBold}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        aria-label="Italic"
        pressed={isItalic}
        onPressedChange={formatItalic}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        aria-label="Underline"
        pressed={isUnderline}
        onPressedChange={formatUnderline}
        className="h-8 w-8 p-0"
      >
        <Underline className="h-4 w-4" />
      </Toggle>
      <Separator orientation="vertical" className="h-6 mx-1" />
      {/* Lists and quote */}
      <Button
        variant={blockType === 'bullet' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8 p-0"
        aria-label="Bulleted List"
        onClick={blockType === 'bullet' ? removeList : formatBulletList}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={blockType === 'number' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8 p-0"
        aria-label="Numbered List"
        onClick={blockType === 'number' ? removeList : formatNumberedList}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant={blockType === 'quote' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8 p-0"
        aria-label="Quote"
        onClick={formatQuote}
      >
        <Quote className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface LexicalEditorProps {
  initialValue?: any
  onChange?: (editorState: EditorState, editor: LexicalEditorType, tags: Set<string>) => void
  placeholder?: string
  className?: string
}

export function LexicalEditor({
  initialValue,
  onChange,
  placeholder = 'Start writing your notes...',
  className,
}: LexicalEditorProps) {
  // Defensive initial value handling
  const safeInitialValue = initialValue
    ? typeof initialValue === 'string'
      ? JSON.parse(initialValue)
      : initialValue
    : undefined

  const initialConfig = {
    namespace: 'NotesEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
    ],
    editorState: safeInitialValue ? JSON.stringify(safeInitialValue) : undefined,
  }

  const handleChange = (editorState: EditorState, editor: LexicalEditorType, tags: Set<string>) => {
    if (onChange) {
      onChange(editorState, editor, tags)
    }
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-background', className)}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-[200px] p-4 outline-none resize-none text-sm leading-relaxed focus:outline-none prose dark:prose-invert w-full"
                style={{ caretColor: 'hsl(var(--foreground))' }}
              />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none text-sm">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={handleChange} />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        </div>
      </LexicalComposer>
    </div>
  )
}

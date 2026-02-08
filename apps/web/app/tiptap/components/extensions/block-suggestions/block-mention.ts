import { Node, mergeAttributes } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { BlockSuggestionList, BlockSuggestionListRef } from './block-suggestion-list'
import { blockSuggestions } from '../block-suggestions'
import { Editor } from '@tiptap/core'

export type BlockSuggestionItem = {
  id: string
  label: string
  icon?: string
  description?: string
  command: (editor: Editor) => void
}

export const BlockMention = Node.create({
  name: 'blockMention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel({ node }: { node: any }) {
        return `/${node.attrs.label ?? node.attrs.id}`
      },
      suggestion: {
        char: '/',
        items: ({ query }: { query: string }): BlockSuggestionItem[] => {
          return blockSuggestions.filter(item =>
            item.label.toLowerCase().includes(query.toLowerCase())
          )
        },
        render: () => {
          let component: ReactRenderer<BlockSuggestionListRef> | null = null
          let popup: TippyInstance[] | null = null

          return {
            onStart: (props: SuggestionProps<BlockSuggestionItem>) => {
              component = new ReactRenderer(BlockSuggestionList, {
                props,
                editor: props.editor,
              })

              if (!props.clientRect) {
                return
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },

            onUpdate(props: SuggestionProps<BlockSuggestionItem>) {
              component?.updateProps(props)

              if (!props.clientRect) {
                return
              }

              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              })
            },

            onKeyDown(props: { event: KeyboardEvent }) {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide()
                return true
              }

              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit() {
              popup?.[0]?.destroy()
              component?.destroy()
            },
          }
        },
        command: ({ editor, range, props }: { 
          editor: Editor
          range: { from: number; to: number }
          props: BlockSuggestionItem 
        }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .run()

          props.command(editor)
        },
      } as Partial<SuggestionOptions<BlockSuggestionItem>>,
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-id'),
        renderHTML: (attributes: { id?: string | null }) => {
          if (!attributes.id) return {}
          return { 'data-id': attributes.id }
        },
      },
      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-label'),
        renderHTML: (attributes: { label?: string | null }) => {
          if (!attributes.label) return {}
          return { 'data-label': attributes.label }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="block-mention"]' }]
  },

  renderHTML({ node, HTMLAttributes }: { node: any; HTMLAttributes: Record<string, any> }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': 'block-mention' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      this.options.renderLabel({ node }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
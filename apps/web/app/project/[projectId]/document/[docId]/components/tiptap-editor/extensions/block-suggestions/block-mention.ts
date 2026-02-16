import { Node, mergeAttributes } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
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

export interface BlockMentionOptions {
  HTMLAttributes: Record<string, any>
  renderLabel: (props: { node: any }) => string
  suggestion: Omit<SuggestionOptions<BlockSuggestionItem>, 'editor'>
  onSearch?: (query: string) => Promise<BlockSuggestionItem[]>
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
      onSearch: undefined,
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

              // Create tippy instance
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                popperOptions: {
                  strategy: 'fixed',
                  modifiers: [
                    {
                      name: 'flip',
                      enabled: true,
                    },
                    {
                      name: 'preventOverflow',
                      options: {
                        rootBoundary: 'viewport',
                        tether: false,
                        altAxis: true,
                      },
                    },
                  ],
                },
              })

              // Add scroll listener to update position
              const scrollContainer = document.querySelector('.simple-editor-content');
              if (scrollContainer && popup[0]) {
                const handleScroll = () => {
                  popup?.[0]?.popperInstance?.update();
                };
                scrollContainer.addEventListener('scroll', handleScroll);
                // Store handler on instance to remove later if needed, 
                // but simpler to use a closure if we clean up correctly
                (popup[0] as any)._handleScroll = handleScroll;
              }
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
              // Remove scroll listener
              const scrollContainer = document.querySelector('.simple-editor-content');
              if (scrollContainer && popup?.[0] && (popup[0] as any)._handleScroll) {
                scrollContainer.removeEventListener('scroll', (popup[0] as any)._handleScroll);
              }
              
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
        pluginKey: new PluginKey('block_mention_slash'),
        editor: this.editor,
        ...this.options.suggestion,
      }),
      Suggestion({
        pluginKey: new PluginKey('block_mention_at'),
        editor: this.editor,
        char: '@',
        items: ({ query }: { query: string }) => {
          if (this.options.onSearch) {
             // onSearch returns valid items, but we need to ensure type safety if needed.
             // The original code was `async` but the return type of `items` in SuggestionOptions is `Item[] | Promise<Item[]>`.
             // `onSearch` returns `Promise`.
            return this.options.onSearch(query) ?? []
          }
          return []
        },
        render: this.options.suggestion.render,
        command: this.options.suggestion.command,
      }),
    ]
  },
})
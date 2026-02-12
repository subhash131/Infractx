import { BlockSuggestionItem } from './block-mention'
import { Editor } from '@tiptap/core'

export const blockSuggestions: BlockSuggestionItem[] = [
  {
    id: 'smart-block',
    label: 'Smart Block',
    icon: '@',
    description: 'Create a custom smart block',
    command: (editor: Editor) => {
      const { from } = editor.state.selection
      editor
        .chain()
        .focus()
        .insertContent({
          type: "smartBlock",
          content: [
            { type: "smartBlockContent" },
            {
              type: "smartBlockGroup",
              content: [
                { type: "paragraph" }
              ]
            }
          ]
        })
        .setTextSelection(from + 1)
        .run()
    },
  },
  {
    id: 'heading-1',
    label: 'Heading 1',
    icon: 'H1',
    description: 'Big section heading',
    command: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
  },
  {
    id: 'heading-2',
    label: 'Heading 2',
    icon: 'H2',
    description: 'Medium section heading',
    command: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
  },
  {
    id: 'heading-3',
    label: 'Heading 3',
    icon: 'H3',
    description: 'Small section heading',
    command: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
  },
  {
    id: 'bullet-list',
    label: 'Bullet List',
    icon: '•',
    description: 'Create a simple bullet list',
    command: (editor: Editor) => {
      editor.chain().focus().toggleBulletList().run()
    },
  },
  {
    id: 'numbered-list',
    label: 'Numbered List',
    icon: '1.',
    description: 'Create a list with numbering',
    command: (editor: Editor) => {
      editor.chain().focus().toggleOrderedList().run()
    },
  },
  {
    id: 'task-list',
    label: 'Task List',
    icon: '☑',
    description: 'Track tasks with a checklist',
    command: (editor: Editor) => {
      editor.chain().focus().toggleTaskList().run()
    },
  },
  {
    id: 'blockquote',
    label: 'Quote',
    icon: '"',
    description: 'Capture a quote',
    command: (editor: Editor) => {
      editor.chain().focus().toggleBlockquote().run()
    },
  },
  {
    id: 'code-block',
    label: 'Code Block',
    icon: '</>',
    description: 'Display code with syntax highlighting',
    command: (editor: Editor) => {
      editor.chain().focus().toggleCodeBlock().run()
    },
  },
  {
    id: 'horizontal-rule',
    label: 'Divider',
    icon: '—',
    description: 'Visually divide blocks',
    command: (editor: Editor) => {
      editor.chain().focus().setHorizontalRule().run()
    },
  },
  {
    id: 'image',
    label: 'Image',
    icon: '🖼',
    description: 'Upload or embed an image',
    command: (editor: Editor) => {
      const url = window.prompt('Enter image URL')
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    },
  },
  {
    id: 'table',
    label: 'Table',
    icon: '▦',
    description: 'Insert a table',
    command: (editor: Editor) => {
      const makeCell = (type: 'tableHeader' | 'tableCell') => ({
        type,
        content: [{ type: 'tableParagraph' }],
      })

      editor
        .chain()
        .focus()
        .insertContent({
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [makeCell('tableHeader'), makeCell('tableHeader'), makeCell('tableHeader')],
            },
            {
              type: 'tableRow',
              content: [makeCell('tableCell'), makeCell('tableCell'), makeCell('tableCell')],
            },
            {
              type: 'tableRow',
              content: [makeCell('tableCell'), makeCell('tableCell'), makeCell('tableCell')],
            },
          ],
        })
        .run()
    },
  },
]
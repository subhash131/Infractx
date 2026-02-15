import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import "./ai-extension.scss"

export const AIExtension = Extension.create({
  name: 'aiExtension',

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('ai-selection-menu')

    return [
      new Plugin({
        key: pluginKey,
        view(editorView) {
          return new AISelectionMenuView(editorView)
        },
      }),
    ]
  },
})

class AISelectionMenuView {
  public menu: HTMLDivElement
  private editorView: EditorView
  private isMouseDown: boolean = false

  constructor(editorView: EditorView) {
    this.editorView = editorView
    this.menu = document.createElement('div')
    this.menu.className = 'ai-selection-menu-floating'
    this.menu.style.position = 'absolute'
    this.menu.style.zIndex = '10'
    this.menu.style.display = 'none' 
    this.menu.style.visibility = 'hidden'
    this.menu.style.opacity = '0'
    this.menu.style.transition = 'opacity 0.2s'

    const button = document.createElement('button')
    button.className = 'ai-ask-button'
    button.textContent = '✨ Ask AI'
    
    // Prevent menu from closing when clicking the button
    button.onmousedown = (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.isMouseDown = true
    }
    
    button.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()

      const { from, to } = this.editorView.state.selection;
      
      window.dispatchEvent(
        new CustomEvent("toggle-ai-chat", {
          detail: {
            from,
            to,
          },
        })
      )      
      this.hide()
    }

    this.menu.appendChild(button)
    
    // Prevent menu from interfering with editor
    this.menu.onmousedown = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }
    
    document.body.appendChild(this.menu)

    this.update(editorView)
  }

  hide() {
    this.menu.style.visibility = 'hidden'
    this.menu.style.opacity = '0'
    this.menu.style.display = 'none'
  }

  update(view: EditorView, lastState?: any) {
    // Don't hide if mouse is down (user is clicking the button)
    if (this.isMouseDown) {
      this.isMouseDown = false
      return
    }

    const state = view.state
    const { from, to, empty } = state.selection

    // Hide if no selection
    if (empty) {
      this.hide()
      return
    }

    // Only update position if menu is already visible or just became visible
    this.updatePosition(view, from, to)
  }

  updatePosition(view: EditorView, from: number, to: number) {
    try {
      
      if (!view) return
      const { state } = view
      if (!state) return

      const { selection, doc } = state
      if (!selection || !doc) return

      if (selection.empty) return

      const selectedText = doc.textBetween(
        selection.from,
        selection.to,
        " "
      )

      if(!selectedText.trim()) return
      // Get the coordinates of the selection
      const start = view.coordsAtPos(from)
      const end = view.coordsAtPos(to)

      // Make menu visible first to get its dimensions
      this.menu.style.display = 'block'
      this.menu.style.visibility = 'visible'
      this.menu.style.opacity = '0' // Keep invisible while calculating

      // Calculate position (centered above selection)
      const box = this.menu.getBoundingClientRect()
      const left = Math.max((start.left + end.left) / 2 - box.width / 2, 10)
      const top = start.top - box.height - 8 // 8px gap above selection

      this.menu.style.left = `${left}px`
      this.menu.style.top = `${top}px`
      
      // Now make it visible with fade-in
      requestAnimationFrame(() => {
        this.menu.style.opacity = '1'
      })
    } catch (error) {
      console.error('Error updating AI menu position:', error)
      this.hide()
    }
  }

  destroy() {
    this.menu.remove()
  }
}
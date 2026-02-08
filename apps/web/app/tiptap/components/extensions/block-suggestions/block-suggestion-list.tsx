'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { BlockSuggestionItem } from './block-mention'
import './block-suggestion-list.scss'

export interface BlockSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

interface BlockSuggestionListProps {
  items: BlockSuggestionItem[]
  command: (item: BlockSuggestionItem) => void
}

export const BlockSuggestionList = forwardRef<
  BlockSuggestionListRef,
  BlockSuggestionListProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }): boolean => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    <div className="block-suggestion-list">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            key={item.id}
            className={`block-suggestion-item ${
              index === selectedIndex ? 'is-selected' : ''
            }`}
            onClick={() => selectItem(index)}
            type="button"
          >
            {item.icon && <span className="icon">{item.icon}</span>}
            <div className="content">
              <div className="label">{item.label}</div>
              {item.description && (
                <div className="description">{item.description}</div>
              )}
            </div>
          </button>
        ))
      ) : (
        <div className="block-suggestion-empty">No results</div>
      )}
    </div>
  )
})

BlockSuggestionList.displayName = 'BlockSuggestionList'
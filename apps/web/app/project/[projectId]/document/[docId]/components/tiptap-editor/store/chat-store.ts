import { create } from 'zustand'
import type { Editor } from '@tiptap/react'

type SelectedContext = {
    text: string;
    from: number;
    to: number;
    id: string;
}

export const RESET_STREAMING_TEXT = "----reset---"
export const TOGGLE_POPUP = "----toggle-popup---"


interface ChatStore {
    selectedContext: SelectedContext[]
    setSelectedContext: (selectedText: SelectedContext | "reset") => void
    removeContext: (id: string) => void
    streamingText: string
    setStreamingText: (text: string) => void
    showAIPopup: boolean
    setShowAIPopup: (show: boolean | typeof TOGGLE_POPUP) => void
    editor: Editor | null
    setEditor: (editor: Editor | null) => void
}

export const useChatStore = create<ChatStore>((set) => ({
    streamingText: "",
    setStreamingText: (text: string) => set((state) => ({
        streamingText: text === RESET_STREAMING_TEXT ? "" : state.streamingText + text
    })),
    selectedContext: [],
    showAIPopup: false,
    setShowAIPopup: (show: boolean | typeof TOGGLE_POPUP) => set((state) => ({
        showAIPopup: show === TOGGLE_POPUP ? !state.showAIPopup : show
    })),
    setSelectedContext: (selectedText: SelectedContext | "reset") => set((state) => {
        if(selectedText === "reset") return {selectedContext: []}
        const isOverlapping = state.selectedContext.some((existing) => {
            return existing.from === selectedText.from && existing.to === selectedText.to;
        });

        if (isOverlapping) {
            return state;
        }

        return { selectedContext: [...state.selectedContext, selectedText] }
    }),
    removeContext: (id: string) => set((state) => ({
        selectedContext: state.selectedContext.filter((context) => context.id !== id)
    })),
    editor: null,
    setEditor: (editor: Editor | null) => set({ editor }),
}))
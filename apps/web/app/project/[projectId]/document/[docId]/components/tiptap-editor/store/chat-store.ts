import { create } from 'zustand'

type SelectedContext = {
    text: string;
    from: number;
    to: number;
    id: string;
}

export const RESET_STREAMING_TEXT = "----reset---"


interface ChatStore {
    selectedContext: SelectedContext[]
    setSelectedContext: (selectedText: SelectedContext | "reset") => void
    removeContext: (id: string) => void
    streamingText: string
    setStreamingText: (text: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
    streamingText: "",
    setStreamingText: (text: string) => set((state) => ({
        streamingText: text === RESET_STREAMING_TEXT ? "" : state.streamingText + text
    })),
    selectedContext: [],
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
    }))
}))
import { create } from 'zustand'

type SelectedContext = {
    text: string;
    from: number;
    to: number;
    id: string;
}

interface ChatStore {
    selectedContext: SelectedContext[]
    setSelectedContext: (selectedText: SelectedContext) => void
    removeContext: (id: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
    selectedContext: [],
    setSelectedContext: (selectedText: SelectedContext) => set((state) => {
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
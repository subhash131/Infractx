"use client";
import "@blocknote/core/fonts/inter.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useState } from "react";
import "./styles.css";

import { en } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import {
  AIExtension,
  AIToolbarButton,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import "@blocknote/xl-ai/style.css";

import { DefaultChatTransport } from "ai";
import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";

export default function CollaborativeEditor() {
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn,
    },
    extensions: [
      AIExtension({
        transport: new DefaultChatTransport({
          api: `/api/chat`,
          body: {},
        }),
      }),
    ],
    initialContent: [
      {
        type: "paragraph",
        content: "",
      },
      {
        type: "paragraph",
        content: "",
      },
      {
        type: "paragraph",
        content: "",
      },
    ],
  });

  const [windowLoaded, setWindowLoaded] = useState(false);
  useEffect(() => {
    setWindowLoaded(true);
  }, []);

  if (!windowLoaded) return;

  return (
    <>
      <BlockNoteView
        editor={editor}
        // We're disabling some default UI elements
        formattingToolbar={false}
        slashMenu={false}
        style={{
          minHeight: "100vh",
        }}
      >
        {/* Add the AI Command menu to the editor */}
        {/* <AIMenuController /> */}
        {/* We disabled the default formatting toolbar with `formattingToolbar=false` 
        and replace it for one with an "AI button" (defined below). 
        (See "Formatting Toolbar" in docs)
        */}
        {/* <FormattingToolbarWithAI /> */}
        {/* We disabled the default SlashMenu with `slashMenu=false` 
        and replace it for one with an AI option (defined below). 
        (See "Suggestion Menus" in docs)
        */}
        <SuggestionMenuWithAI editor={editor} />
        <SuggestionMenuFroRequirements editor={editor} />
      </BlockNoteView>
    </>
  );
}

function FormattingToolbarWithAI() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {...getFormattingToolbarItems()}
          {/* Add the AI button */}
          <AIToolbarButton />
        </FormattingToolbar>
      )}
    />
  );
}

function SuggestionMenuWithAI(props: {
  editor: BlockNoteEditor<any, any, any>;
}) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(props.editor),
            // add the default AI slash menu items, or define your own
            ...getAISlashMenuItems(props.editor),
          ],
          query,
        )
      }
    />
  );
}

function SuggestionMenuFroRequirements(props: {
  editor: BlockNoteEditor<any, any, any>;
}) {
  return (
    <SuggestionMenuController
      triggerCharacter="@"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            {
              title: "My Requirement",
              onItemClick: () => {
                // Inserts text at the current cursor position
                props.editor.insertInlineContent([
                  {
                    type: "text",
                    text: "Inserted Requirement!", // Added a space at the end for convenience
                  },
                ]);
              },
            },
          ],
          query,
        )
      }
    />
  );
}

"use client";
import "@blocknote/core/fonts/inter.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
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
import { api } from "@workspace/backend/_generated/api";

import { useBlockNoteSync } from "./hooks/use-blocknote-sync";

export default function CollaborativeEditor() {
  const [windowLoaded, setWindowLoaded] = useState(false);

  const { editor, isLoading } = useBlockNoteSync(api.requirements, "some-id", {
    editorOptions: {
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
    },
  });

  useEffect(() => {
    setWindowLoaded(true);
  }, []);

  if (!windowLoaded || isLoading || !editor) {
    return <div>Loading Editor...</div>;
  }

  return (
    <BlockNoteView
      editor={editor}
      formattingToolbar={false}
      slashMenu={false}
      style={{ minHeight: "100vh" }}
    >
      <FormattingToolbarWithAI />
      <SuggestionMenuWithAI editor={editor} />
      <SuggestionMenuFroRequirements editor={editor} />
    </BlockNoteView>
  );
}

function FormattingToolbarWithAI() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {...getFormattingToolbarItems()}
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
                props.editor.insertInlineContent([
                  {
                    type: "text",
                    text: "Inserted Requirement! ",
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

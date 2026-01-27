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
  AIMenuController,
} from "@blocknote/xl-ai";
import "@blocknote/xl-ai/style.css";

import { DefaultChatTransport } from "ai";
import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";

export default function Editor() {
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
        type: "heading",
        props: {
          level: 1,
        },
        content: "Open source software",
      },
      {
        type: "paragraph",
        content:
          "Open source software refers to computer programs whose source code is made available to the public, allowing anyone to view, modify, and distribute the code. This model stands in contrast to proprietary software, where the source code is kept secret and only the original creators have the right to make changes. Open projects are developed collaboratively, often by communities of developers from around the world, and are typically distributed under licenses that promote sharing and openness.",
      },
      {
        type: "paragraph",
        content:
          "One of the primary benefits of open source is the promotion of digital autonomy. By providing access to the source code, these programs empower users to control their own technology, customize software to fit their needs, and avoid vendor lock-in. This level of transparency also allows for greater security, as anyone can inspect the code for vulnerabilities or malicious elements. As a result, users are not solely dependent on a single company for updates, bug fixes, or continued support.",
      },
      {
        type: "paragraph",
        content:
          "Additionally, open development fosters innovation and collaboration. Developers can build upon existing projects, share improvements, and learn from each other, accelerating the pace of technological advancement. The open nature of these projects often leads to higher quality software, as bugs are identified and fixed more quickly by a diverse group of contributors. Furthermore, using open source can reduce costs for individuals, businesses, and governments, as it is often available for free and can be tailored to specific requirements without expensive licensing fees.",
      },
      {
        type: "paragraph",
        content:
          "Additionally, open development fosters innovation and collaboration. Developers can build upon existing projects, share improvements, and learn from each other, accelerating the pace of technological advancement. The open nature of these projects often leads to higher quality software, as bugs are identified and fixed more quickly by a diverse group of contributors. Furthermore, using open source can reduce costs for individuals, businesses, and governments, as it is often available for free and can be tailored to specific requirements without expensive licensing fees.",
      },
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
      <AIMenuController />
      {/* We disabled the default formatting toolbar with `formattingToolbar=false` 
        and replace it for one with an "AI button" (defined below). 
        (See "Formatting Toolbar" in docs)
        */}
      <FormattingToolbarWithAI />
      {/* We disabled the default SlashMenu with `slashMenu=false` 
        and replace it for one with an AI option (defined below). 
        (See "Suggestion Menus" in docs)
        */}
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

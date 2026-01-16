"use node";
import { AgentState, Layer } from "../types";
import { generateComponentLayers } from "./generateComponentsLayer";
import { generateFromTemplate } from "./generateFromTemplate";

export async function componentGenerationNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const allLayers: Layer[] = [];
  const generationLog: string[] = [];
  const errors: string[] = [];

  console.log(
    `[componentGeneration] Starting generation of ${state.componentsToGenerate!.length} components`
  );

  for (let i = 0; i < state.componentsToGenerate!.length; i++) {
    const component = state.componentsToGenerate![i];

    console.log(
      `[componentGeneration] [${i + 1}/${state.componentsToGenerate!.length}] Generating ${component.type}...`
    );

    try {
      const componentLayers = await generateComponentLayers({
        component,
        requirements: state.requirements!,
        designSystem: state.designSystem!,
        previousLayers: allLayers,
        attempt: 1,
        maxAttempts: 3,
      });

      console.log(
        `[componentGeneration] ✓ ${component.type}: ${componentLayers.length} layers created`
      );
      generationLog.push(
        `✓ ${component.type}: ${componentLayers.length} layers`
      );

      allLayers.push(...componentLayers);
    } catch (error) {
      console.error(`[componentGeneration] ✗ ${component.type} failed:`, error);

      try {
        console.log(
          `[componentGeneration] Attempting fallback for ${component.type}...`
        );
        const fallbackLayers = await generateFromTemplate(
          component.type,
          component.position,
          state.pageId
        );

        console.log(
          `[componentGeneration] ⚠ ${component.type}: Used fallback template`
        );
        generationLog.push(`⚠ ${component.type}: Fallback used`);

        allLayers.push(...fallbackLayers);
      } catch (fallbackError) {
        console.error(
          `[componentGeneration] ✗ ${component.type}: Fallback also failed, skipping`
        );
        generationLog.push(`✗ ${component.type}: Skipped`);
        errors.push(`Failed to generate ${component.type}: ${error}`);
      }
    }
  }

  console.log(
    `[componentGeneration] ✓ Complete: ${allLayers.length} total layers generated`
  );

  return {
    generatedLayers: allLayers,
    generationLog,
    errors: errors.length > 0 ? errors : undefined,
  };
}

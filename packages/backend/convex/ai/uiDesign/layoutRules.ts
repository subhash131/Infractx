// "use node";
// import { Component } from "./types";

// export class LayoutRules {
//   static VIEWPORTS = { desktop: 1440, tablet: 768, mobile: 375 };
//   static SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 64 };
//   static TYPOGRAPHY = { h1: 56, h2: 40, h3: 32, h4: 24, body: 18, small: 14 };

//   static center(containerWidth: number, elementWidth: number): number {
//     return (containerWidth - elementWidth) / 2;
//   }

//   static stackVertical(
//     previousTop: number,
//     previousHeight: number,
//     gap: number,
//   ): number {
//     return previousTop + previousHeight + gap;
//   }

//   static determineViewport(requirements: {
//     projectType: string;
//     style: string;
//   }): {
//     type: "desktop" | "tablet" | "mobile";
//     width: number;
//   } {
//     const combined =
//       `${requirements.projectType} ${requirements.style}`.toLowerCase();
//     if (combined.includes("mobile"))
//       return { type: "mobile", width: this.VIEWPORTS.mobile };
//     if (combined.includes("tablet"))
//       return { type: "tablet", width: this.VIEWPORTS.tablet };
//     return { type: "desktop", width: this.VIEWPORTS.desktop };
//   }

//   static calculateTotalHeight(sections: Component[]): number {
//     return sections.reduce(
//       (total, s) => total + s.height + this.SPACING.xxl,
//       0,
//     );
//   }
// }

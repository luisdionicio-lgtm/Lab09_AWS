---
name: Lumbre
description: Quiet image workspace with a museum collection character.
colors:
  canvas: "#f3f5f7"
  paper: "#ffffff"
  ink: "#172c3b"
  muted: "#526574"
  brand: "#245c83"
  line: "#d7e0e6"
  danger: "#a52e37"
typography:
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "clamp(40px, 5vw, 68px)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
rounded:
  panel: "16px"
  image: "12px"
  control: "8px"
  thumbnail: "6px"
spacing:
  small: "12px"
  medium: "16px"
  large: "24px"
  panel: "28px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
---

# Design System: Lumbre

## Overview

**Creative North Star: "Museum collection interface"**

Lumbre is a quiet workspace for reviewing photography. Steel-blue controls and broad white surfaces support images with small utilitarian captions. The user delegated this visual direction; the interface operates as a working collection rather than a decorative catalog.

**Key Characteristics:**

- Images lead, with consistent crops in the collection and uncropped viewing in the preview.
- Large, restrained headings and compact supporting labels.
- Calm spacing and clearly bounded operating controls.

## Colors

The cool neutral palette gives photographs visual prominence. Brand steel blue identifies primary actions and upload affordances. Ink carries headings; muted blue-gray carries supporting information. Paper panels sit against the canvas, with line-colored dividers. Danger red identifies destructive actions and errors.

## Typography

Manrope is self-hosted at weights 400, 600, 700 and 800, with system sans-serif fallbacks. The display role uses the frontmatter scale; below 640px the introduction heading is 42px. Collection titles reduce from 28px to 24px. Introductory body copy uses 1.8 line-height and a 37ch maximum width; mobile copy is 14px. Controls and photo names use the label role; metadata is generally 12px. The wordmark uses weight 800.

## Layout

The main container is at most 1440px wide with horizontal padding of the larger of 5vw or 24px. The introduction pairs copy with an upload panel in a 1.1fr/1fr grid. Gallery columns change from three to two at 900px. At 640px, the introduction stacks, main padding becomes 20px, and gallery crops change from 4:3 to 3:4 while retaining two columns. Desktop gallery gaps are 32px vertically and 24px horizontally; mobile gaps are 24px and 12px. Header and footer account for device safe areas.

## Elevation & Depth

Working surfaces are flat, separated by white panels, cool tonal fills and fine borders. Dialogs alone receive the structural shadow `0 16px 60px #172c3b33`; their backdrop is `#172c3bb3`. Image previews use a subdued cool background.

## Shapes

Panels and dialogs use the panel radius, image crops and the upload target use the image radius, and buttons use the control radius. Small thumbnails and image actions use the thumbnail radius. Circular close controls are reserved for overlays. Drop targets use a dashed border.

## Components

Buttons are compact, bold and at least 44px tall. Primary actions use brand blue, secondary actions use paper with a line border, and destructive actions use danger red. Fine-pointer hover states darken primary and danger colors and tint secondary actions. Pressed buttons scale to 0.98; disabled buttons use 0.5 opacity. State transitions take 150ms ease-out.

The upload panel has 28px padding, reduced to 20px on mobile. Its dashed drop target is at least 168px tall with a pale blue fill; dragging strengthens the brand border and background. File selection is a full-target native input.

The toolbar uses top and bottom dividers with unboxed search and sort fields. Search is 16px and wraps onto its own row on mobile. Navigation pairs a bold wordmark with understated context and a connection indicator; context is hidden below 900px.

Photo cards have no surrounding panel or shadow. Images crop consistently and captions truncate long filenames. Image action targets are 44px square. Fine-pointer image hover scales the crop to 1.025 over 250ms ease-out. Preview dialogs show contained images rather than cropping them.

Keyboard focus uses a 3px blue outline with 4px offset. Hover styling is gated to fine pointers; reduced-motion preferences disable transitions and smooth scrolling. Do not describe dialog or progress animation beyond what is implemented.

## Do's and Don'ts

- **Do** let actual collection images carry the identity.
- **Do** maintain quiet controls, clear focus and explicit empty states.
- **Do** preserve consistent collection crops and contained full-image previews.
- **Don't** add simulated photographs or fabricated upload results.
- **Don't** add decorative stamps or crosshairs that obscure operating controls.

# Lucid — Intelligent Practice Engine

Design system untuk UI components yang reusable, responsive, dan production-ready.

---

## Overview

- **Layout:** Grid
- **Content Width:** Full Bleed
- **Framing:** Glassy
- **Grid:** Strong

---

## Colors (Light Mode)

| Token | Hex |
|-------|-----|
| Primary | `#9FD8BD` |
| Secondary | `#E2A356` |
| Tertiary | `#A3D1DF` |
| Neutral | `#93A096` |
| Background | `#9FD8BD` |
| Surface | `#EEEAE0` |
| Text Primary | `#93A096` |
| Text Secondary | `#EEEAE0` |
| Border | `#070B09` |
| Accent | `#9FD8BD` |

### Gradients

```
bg-gradient-to-br from-[#9FD8BD]/50 to-transparent
bg-gradient-to-br from-[#CCBE97]/50 to-transparent
bg-gradient-to-br from-[#E2A356]/50 to-transparent
```

---

## Typography

| Style | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| Display LG | Bricolage Grotesque | 48px | 300 | 47.04px | -0.025em |
| Body MD | Instrument Sans | 12.8px | 300 | 19.2px | - |
| Label MD | Instrument Sans | 14.4px | 400 | 21.6px | 0.144px |

---

## Spacing

- **Base unit:** 4px
- **Scale:** 1px, 2.88px, 4px, 4.8px, 5.6px, 8.8px, 9.6px, 14.4px
- **Section padding:** 29.6px, 32px, 36.8px
- **Card padding:** 12px
- **Gaps:** 9.6px, 10.4px, 17.6px, 22.4px

---

## Shapes & Radius

- **Corner radii:** 4px, 8px, 9px, 9999px
- **Icon treatment:** Linear
- **Icon set:** Solar

---

## Elevation & Depth

- **Surface style:** Glass
- **Borders:** 0.73px solid
  - `#070B09`
  - `#E2A356`
  - `#EEEAE0`
- **Shadows:** `rgba(159, 216, 189, 0.365) 0px 0px 0px 1.6977px`
- **Blur:** 4px, 6px

### Gradient Border Shell

Wrap surface in outer shell with 0.72px padding, 0px radius. Inset content inside wrapper with slightly smaller radius so gradient appears as hairline frame.

---

## Components

### Buttons

**Primary:** bg `#EEEAE0`, text `#0A0F0C`, radius 9999px, padding 15.2px, border 0px.

**Link:** text `#93A096`, radius 9999px, padding 8.8px, border 0.73px solid transparent.

---

## Motion

- **Level:** moderate
- **Durations:** 150ms, 300ms
- **Easings:** ease, cubic-bezier(0.19, 1, 0.22, 0)
- **Hover:** text, shadow, color
- **Scroll:** GSAP ScrollTrigger

---

## WebGL (Background)

- **Stack:** ThreeJS, WebGL
- **Effect:** Fine line lattice — retro-futurist, technical, meditative
- **Primitives:** Line trails + sparse anchors
- **Animation:** Slow breathing pulse
- **Interaction:** Pointer-reactive drift
- **Renderer:** alpha, DPR clamp, custom shaders
- **Fallback:** Reduced motion + DOM fallback

### ThreeJS Config

- **Camera:** Orthographic projection
- **Geometry:** Plane
- **Materials:** ShaderMaterial
- **Lighting:** Ambient + key + rim
- **Motion:** Slow orbital drift

---

## Do's

- Use primary palette as main accent for emphasis and action states
- Keep spacing aligned to 4px rhythm
- Reuse Glass surface treatment consistently
- Keep corner radii within 4px, 8px, 9px, 9999px family

## Don'ts

- Don't introduce extra accent colors outside core palette
- Don't mix unrelated shadow or blur recipes
- Don't exceed moderate motion intensity without deliberate reason

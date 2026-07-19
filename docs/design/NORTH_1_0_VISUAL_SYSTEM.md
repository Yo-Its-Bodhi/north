# North 1.0 Visual System

## Intent

North should feel calm, deliberate, and earned. Progress is evidence, not a game score. Decoration must never compete with the next useful action.

## Primitives

| Primitive | Rule |
| --- | --- |
| Canvas | Quiet off-white or dark neutral field; no content lives directly on a decorative gradient. |
| Raised workspace | Solid surface, one light divider, 12px radius, no ornamental shadow. |
| Selected state | Tint plus active divider; do not use glow as the only state signal. |
| Modal | Solid raised workspace, 16px radius, clear close action, no nested cards. |
| Primary action | Filled North teal/deep-teal command. One per decision area. |
| Secondary action | Bordered, solid-surface action for a meaningful alternative. |
| Quiet action | Text or icon-plus-text action with no container. |
| Icon action | 40-44px square, one restrained functional Lucide icon and an accessible label. |
| Borders | `--north-divider` for structure, `--north-active-divider` for selection, `--north-danger-divider` for destructive actions. |
| Spacing | 4, 8, 12, 16, 24, 32, 48px. Components use these intervals rather than arbitrary gaps. |
| Corners | 8px for controls, 12px for raised workspace, 16px for modal/hero surfaces. |
| Data | Thin progress tracks, timeline marks, and circular progress only for sustained completion. Charts answer one question at a time. |

## Component Inventory

| Component | Primary use | Current owners |
| --- | --- | --- |
| Direction hero | Today’s one meaningful next action | Today, Training |
| Record band | Compact evidence at a glance | Today, Journey, You |
| Timeline row | Dated record with one clear outcome | Journey |
| Evidence row | Measured trend or comparison with a visible limit | Journey, Nova |
| Recognition row | Milestone title, current measure, and thin progress | Journey |
| Workspace panel | Operational form or editable work | Training, Account, Admin |
| Context rail | Supporting evidence alongside a main workspace | Desktop Today, Training, Journey, Nova |
| Identity header | Name, direction, and one editable personal statement | You |

## Migration Rules

1. Do not create a new card if a divider and spacing explain the relationship.
2. Do not place headings inside a bordered panel unless that panel is an independent tool.
3. Every screen has one dominant action; alternatives are secondary or quiet.
4. Hide nothing that changes meaning. Reduce repetition before reducing evidence.
5. Desktop adds an intentional main column and supporting rail; it never stretches a mobile stack.

## Migration Order

1. Today establishes the visual language.
2. Training defines operational density.
3. Journey turns the record into timeline, recognition, and evidence.
4. You separates identity from account administration.
5. Onboarding, Account, and Admin use the same primitives without marketing decoration.
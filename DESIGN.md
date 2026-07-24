# Design Brief

## Direction

ICP MCP Server Assistant — a dark-mode-first personal control center for IC MCP setup, memory, and workflows on the Internet Computer, built on neutral grayscale with a single electric cyan accent.

## Tone

Restrained editorial minimalism in the Linear/Vercel tradition — near-pure neutral grayscale canvas, high contrast, surgical accent usage, maximum information density without visual noise.

## Differentiation

A near-pure neutral grayscale canvas (chroma ~0.006-0.008) where a single electric cyan accent (OKLCH H=200) is deployed surgically — active nav states, focus rings, primary CTAs, agent "thinking" indicators — so every accent occurrence reads as intentional signal, not decoration.

## Color Palette

| Token      | OKLCH (dark)      | Role                                  |
| ---------- | ----------------- | ------------------------------------- |
| background | 0.145 0.006 250   | App canvas — near-pure neutral gray   |
| foreground | 0.93 0.008 250    | Primary text, high contrast          |
| card       | 0.175 0.008 250   | Elevated surfaces, cards, popovers    |
| primary    | 0.78 0.16 200     | Electric cyan — CTAs, active, focus   |
| accent     | 0.78 0.16 200     | Same cyan, used for highlights       |
| muted      | 0.2 0.008 250     | Secondary surfaces, chat bubbles     |
| muted-fg   | 0.58 0.008 250    | Secondary text, labels, timestamps   |
| border     | 0.27 0.008 250    | Subtle dividers, card outlines       |
| destructive| 0.6 0.2 25        | Delete, destructive actions           |
| success    | 0.7 0.16 150      | Workflow success, saved states        |

## Typography

- Display: Space Grotesk — headings, nav labels, hero numbers, brand
- Body: General Sans — paragraphs, UI labels, chat messages, forms
- Mono: Geist Mono — canister IDs, code blocks, agent logs, plan steps
- Scale: hero `text-4xl md:text-5xl font-bold tracking-tight`, h2 `text-2xl font-semibold tracking-tight`, label `text-xs font-medium tracking-wider uppercase text-muted-foreground`, body `text-base`

## Elevation & Depth

Layered surfaces without heavy shadow — sidebar and cards sit one step above background via lightness shift (0.145 → 0.175), borders define edges, `shadow-subtle` for interactive cards and `shadow-elevated` for popovers/modals only.

## Structural Zones

| Zone    | Background          | Border         | Notes                                  |
| ------- | ------------------- | -------------- | -------------------------------------- |
| Sidebar | bg-sidebar (0.17)   | border-r       | Fixed left on desktop, collapses mobile |
| Header  | bg-card/60 backdrop | border-b       | Sticky top, blur, page title + actions |
| Content | bg-background       | —              | Main canvas, alternating muted sections |
| Cards   | bg-card             | border         | Rounded 0.5rem, shadow-subtle on hover |
| Footer  | bg-muted/40         | border-t       | Status bar, agent connection state     |

## Spacing & Rhythm

Section gaps `gap-6` to `gap-8`, content grouping `space-y-4`, micro-spacing `gap-2`/`gap-3` for inline elements; sidebar items `py-2 px-3`, chat message padding `p-4`, card padding `p-5` to `p-6`.

## Component Patterns

- Buttons: primary `bg-primary text-primary-foreground` rounded-md, secondary `bg-secondary border`, ghost `hover:bg-muted`; all `transition-smooth`
- Cards: `bg-card border rounded-lg shadow-subtle`, hover lifts to `shadow-elevated`
- Badges: `bg-muted text-muted-foreground` neutral, `bg-primary/10 text-primary` cyan-tinted for active
- Nav items: active state `bg-sidebar-accent text-sidebar-accent-foreground` with left cyan indicator bar
- Chat bubbles: user `bg-primary text-primary-foreground`, agent `bg-muted`, mono for code/plan steps

## Motion

- Entrance: `animate-fade-in-up` 0.3s ease-out on page sections and cards (staggered)
- Hover: `transition-smooth` 0.2s on all interactive elements, card shadow lift
- Decorative: `animate-thinking-dot` staggered cyan dots for agent processing, `animate-pulse-soft` for connection status

## Constraints

- Cyan accent (H=200) used only for primary, accent, ring, focus, active states — never as background fill
- No purple gradients, no full-page gradient backgrounds, no neon glow shadows
- Dark mode is primary; light mode maintained but secondary
- Information density over decoration — productivity app, not showcase

## Signature Detail

The agent "thinking" indicator — three cyan dots with staggered `thinking-dot` animation in the chat input area — signals live AI processing with the same restrained accent that marks every active state, making the accent color the visual thread tying navigation, focus, and AI activity together.

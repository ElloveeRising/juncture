# Wet Arcade

The house aesthetic of **A Schell Company**. First realized in Juncture; carried
forward into every future project. Named for its two halves: *wet* — watercolor,
bleed, softness; *arcade* — 8-bit bones, pixel type, the handmade old web.

The one-line brief: **the hard lines of the old internet, colored in with
watercolors by someone who got the canvas a little too wet on purpose.**

---

## Palette

| Role | Hex | Notes |
|---|---|---|
| Deep turquoise ("chrome") | `#1f8a7d` | bars, links, wordmarks — the anchor hue |
| Sea green | `#35a893` | gradients paired with chrome |
| Seafoam pale | `#dff2ea` | chips, tints |
| Hairline | `#cfe5dd` | every border. Soft, never black |
| Coral | `#ef7d68` / `#e07a58` | warm counterweight, accents |
| Coral clay | `#c0503c` | danger, arbiter red, link-hover `#c2543e` |
| Sunny yellow | `#ffd95e` | THE accent. See the yellow rule |
| Paper | `#f7f3ea` / `#f6f2ea` | page ground — warm, never gray |
| Ink | `#333` on paper; `#1f2528` for features | |
| LCD | `#8aff5a` on `#1a1f16` | readouts, NO ALGORITHM energy |
| Wood | `#8a6d45` → `#6d5233` | skeuomorph cabinets (turntable) |

## The rules

1. **BLUE IS BANNED.** Forever. No Facebook blue, Twitter blue, Windows blue,
   any-app-in-the-world blue. The only blue-adjacent hue allowed is the
   turquoise/seafoam band above — unmistakably sea, never corporate. Purple as
   a primary is equally lazy; it stays an occasional profile-accent only.
2. **The yellow rule.** Sunny yellow never touches a hard black line and never
   gets a hard shape of its own. It appears only as *bleed*: blurred radial
   washes behind things (`.vt-sunwash`), tiny unbordered squares (lit windows),
   glow. If yellow has a crisp edge, it's wrong.
3. **Watercolor bleed.** Where dark lines meet color, the color may smudge past
   the line — soft shadows, blurred halos, feathered edges. Cards stay boxy
   (the arcade half) but their warmth leaks (the wet half).
4. **Pixel bones.** Monospace/pixel type for wordmarks, seals, badges
   (`.vt-pixel`); 88×31 web badges (`.vt-badge88`); 8-bit skyline motifs;
   bevel-shadowed buttons. Modern function, 1999 skeleton, NES accent.
5. **Skeuomorph joy.** Media plays on *things* (a turntable with inertia and
   needle-drop foley), not on bare browser controls. Interactions make honest
   little sounds. Machines in this world have cabinets.
6. **Quotes, not slogans.** Rotating lines from Dickinson/Thoreau/Le Guin/
   Baldwin territory + the house's own voice ("There are no lines."). Never
   rise-and-grind, never corporate-inspirational.
7. **Otto cameos.** The company's octopus appears as an easter egg doing
   something that doesn't matter — that's the point. Canon: flat single-color
   fill, arms same color as body rooted on the underside curve, arms bigger
   than feels safe, both eyes open, side-glance + asymmetric smirk.
8. **Don't fill the space — use it.** (Ryan's law, from the SmallTalk banner
   sessions.) Blank space plus one unique eye-catching thing beats density.
9. **The name is perpetual.** "A SCHELL COMPANY" rides a fixed, click-through
   seal on every page — every screenshot carries it.
10. **Dayton is home.** The 8-bit skyline along the bottom of the window has a
    little Wright flyer in the sky. Local forever.

## Component vocabulary

`.vt-card` boxy bordered card · `.vt-btn` beveled gradient button ·
`.vt-pixel` pixel-era type · `.vt-badge88` web badge · `.vt-sunwash` yellow
bleed · `.vt-marquee` slow scroll · `RecordPlayer` turntable · `OttoSwim`
mascot cameo · `SchellSeal` corner seal · `QuoteWheel` rotating quotes.

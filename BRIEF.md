# BRIEF: IRoD Lab homepage

**Self-authored under explicit creative delegation.** The user gave four answers (below, verbatim choices) and asked for the site to be made "đẹp hơn bằng /scroll-craft". Everything else was authored here. Facts come only from the old homepage HTML and `Linh CV.docx`.

## User answers (verbatim choices)
- Images: "Tải từ irodlab.com"
- Scope: "Chỉ trang chủ, HTML độc lập"
- Structure (Q7): "Nhiều cảnh riêng biệt"
- Range (Q6): "Kỹ thuật / bản vẽ cơ khí"

## The eight topics
1. **Vibe** (authored): precise, calm, quietly clever, engineered. References: an engineering drawing set with its title block, a museum mechanism you are allowed to touch, a journal figure plate.
2. **Journey** (authored): title page → what the lab believes → the one mechanism you can touch → the body of work → the people → where to find us and how to join.
3. **Energy**: calm title page, calm reading, a sharp spike at the arm, steady through the register, warm at the people, settled at the close.
4. **Feeling and the one moment**: see the curve. The moment: letting go of the arm and it stays.
5. **What no other site does**: the homepage lets you feel the lab's core result (static balance) with your own hand.
6. **Range**: technical / mechanical drawing. Not premium-minimal, not a costume. Mono is used only for labels and data.
7. **Structure**: distinct scenes, cut hard.
8. **Assets**: the real lab photo (robot.jpg), the logo, 9 real research figures (white-ground paper figures). No AI generation.

## Feeling curve
| Chapter | Feeling | Caused by |
|---|---|---|
| Title page | calm, precise | drafting-paper ground, the lab name, layered drawing planes that separate as you scroll |
| 1 Belief | curiosity | one plain claim about safety by construction, plus the three places it is applied |
| 2 The balancing arm (PEAK) | surprise, then "oh" | hard cut to blueprint. The arm sweeps under scroll and never drops. Then you drag it, let go, and it stays. Remove the spring and it falls. |
| 3 Register | confidence | nine real projects from 2024 back to 2017, read like a drawing register, with each figure appearing as its row is read |
| 4 People | trust, warmth | the first photograph on the page, the PI's real record |
| Close | resolved | a drawing title block: who, where, how to join. It holds. |

**Peak:** "There's an arm on their homepage you can drag. You let go and it just stays there, because of one spring." Lives in chapter 2, and it has the largest span (pinned, 3.2 viewport heights).

**Tell-someone sentence:** It's the site where you let go of a robot arm and it doesn't fall.

**Authored silence:** the first ~10% of chapter 2 shows only the drawing with no copy change. That is intentional, not dead scroll.

## Notes added after build
- **Chapter codes:** only the folio carries them. In a drawing set the sheet code is information (it says where you are in the set), and the chaptered-editorial grammar asks for a folio with chapter number and title. The in-chapter number badges were removed after review.
- **Feel check (cold walk, one word per chapter):** title: calm. Belief: reading. Arm: surprise (hard cut to blueprint, the largest visual change, 3.2 vh pinned). Register: steady. People: warm (first photograph). Close: settled. Matches the intended curve; no changes needed beyond extending the arm's sweep to cover 5% to 85% of the pin, so the last 14% is a declared hold ("your turn").
- **Counts to confirm with the PI:** 35 journal articles = every entry under JOURNAL PAPERS in the CV, including one listed as "xxx, 2026" (in press), one with only a manuscript number (JMR-26-1076), and one whose author list shows "V.T. Nguyen*" (probably a typo for V.L.).

## Revision 2026-11-12: light/dark, EN/VI, refreshed look

User request (verbatim): "https://nhatanh.ai/work-with-me?v=v5 tham khảo trang web này và làm trang web hiện tại đẹp hơn có hai chế độ sáng tối và hai chế độ tiếng anh và tiếng Việt"

What was taken from the reference (as direction, not copied): serif display headings over a clean sans body, mono eyebrows, rounded soft-bordered cards, a fixed blurred top bar carrying the mode switches, a highlighter mark on one phrase, a navy night theme. Kept from this build: drafting grid, blueprint arm chapter (still the peak), folio, title-block close.

- Theme: html[data-theme] light (drafting paper) / dark (blueprint night). Boot script in <head> picks stored choice, else prefers-color-scheme; follows the system live until the visitor chooses. Stored in localStorage irod-theme.
- Language: html[data-lang] en / vi. Every string is a `data-l` pair; CSS hides the inactive one. Default from stored choice, else navigator.language. Stored in irod-lang. ui.js swaps title, aria-label (data-aria-vi), alt (data-alt-vi) and fires `irod:lang` (site.js re-renders arm readout, button, register caption, folio).
- Publications stay in English (lang="en"), as is usual for paper titles.
- Fonts: Fraunces (display), Be Vietnam Pro (text), IBM Plex Mono (labels); all three ship Vietnamese glyphs.
- Phone: top bar keeps logo + switches; nav moves to a fixed bottom strip.
- Translations: tools/vi.json (long content, keyed by escaped English), inline t(en, vi) for UI strings. gen.py writes tools/vi_todo.json for anything missing.

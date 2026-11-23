# What makes UI look AI-generated or "calculated", and what makes it look made by people

Labels used throughout: **[MEASURED]** is a count or value someone actually took, **[OPINION]** is a critic's or designer's judgement, **[DOCS]** is a vendor's own stated rule, **[MY MEASUREMENT]** was taken for these notes on 2026-11-04, and **[INFERENCE]** is my own reasoning.

Method for [MY MEASUREMENT] items:
- Font data was read directly from the font files on this Mac (Darwin 23.6) with a small parser for the `hmtx`, `cmap` and `GSUB` tables.
- Web values come from the public HTML and CSS of each company's site. These are mostly marketing sites, not the logged-in apps. Counts are CSS declarations, not rendered usage. Token values are the first definition found in the file, usually the default theme.

## 1. What do designers and critics name as tells of AI-generated or "vibe-coded" UI (2024–2026)?

### Takeaway
The best evidence is one deterministic study (Krebs, April 2026) plus opinionated catalogues (Bakaus, Humble). Four items on the owner's list are named outright: all-caps headings, stat banners or hero metrics, identical card grids and monotonous spacing. The tells are statistical signals, not defects. They read as machine-made because they are defaults applied regardless of content, and removing them does not by itself produce good design.

### Cited Findings

**Measured**
- [MEASURED] Adrian Krebs ran deterministic CSS/DOM checks in a headless browser, with no LLM judgement of visuals, on 1,590 Show HN landing pages. High (4+ patterns): 22% (347). Medium (2–3): 32% (508). Low (0–1): 46% (735). His manual QA estimate of false positives is roughly 5–10%. — [Krebs, April 2026](https://adriankrebs.ch/blog/design-slop/)
- [MEASURED, with data-quality caveats] The method section says about 1,400 pages while the results use 1,590. It says 16 patterns but lists 18 items. The post does not reconcile these, and a search-result title for the same URL says 500 pages, so the post may have been extended over time. — [Krebs](https://adriankrebs.ch/blog/design-slop/)
- A search snippet from a secondary report gave a 67% figure for sites with detectable AI fingerprints. It does not match the primary post, where the Medium and High tiers add up to 54%, so do not use it. I could not open the secondary pages to see what it counts ([hyper.ai](https://hyper.ai/en/stories/87f7113ad962c94b2b8f9da986afda49) was blocked by a tool error, [aiproductivity.ai](https://aiproductivity.ai/news/ai-design-slop-show-hn-analysis/) returned HTTP 410), and I do not know which of them carried the number. — [Krebs](https://adriankrebs.ch/blog/design-slop/)
- Krebs's pattern list. Fonts: Inter for everything, specific font pairings, serif italic accent words. Colours: purple-leaning palette, permanent dark mode with low-contrast text, gradients, coloured glows. Layout: centred hero, badge above the H1, coloured card borders, identical icon-topped feature cards, numbered steps, **stat banners**, emoji nav icons, **all-caps headings**. CSS: shadcn/ui, glassmorphism. — [Krebs](https://adriankrebs.ch/blog/design-slop/)
- Scope limit: Krebs scored landing pages, not product UIs or dashboards. — [Krebs](https://adriankrebs.ch/blog/design-slop/)
- Counter-argument (seen in search snippets of the discussion only, not read in full, and not checked against the original thread): sites built on the same component library look alike whether or not AI wrote them, and some of these patterns predate AI. — [HN discussion mirror](https://web-tau-bice-50.vercel.app/item/47864393)

**Opinion catalogues**
- [OPINION] Paul Bakaus's Impeccable catalogue names, among others:
  - **hero metric layout** (big number, small label, supporting stats; he says to lead with a metric only when it helps explain the product)
  - **identical card grids** (every point gets the same weight)
  - **monotonous spacing** (equal gaps hide which items belong together)
  - **flat type hierarchy**, **label above a heading** (eyebrow), **tiny numbered section labels**, **nested cards**
  - **hairline border with wide shadow** (two devices defining the same edge), **extreme radius on cards**, **side-tab accent border**, **decorative grid-line backgrounds**, **all-caps body text**, **wide letter spacing**, **tiny interface text**, overused fonts (Inter, Geist)
  - — [Impeccable](https://impeccable.style/slop?cb=30)
- [OPINION] Bakaus objects to uppercase only in long passages. Short labels and headings are explicitly allowed, so uppercase is not banned. — [Impeccable](https://impeccable.style/slop?cb=30)
- [OPINION] Jeff Humble lists seven tells: neon palette, dark-mode glow, emojis everywhere, purple gradients, cards on cards, multicoloured side tabs, status dots. His explanations are mechanical: models apply the idea that content needs containers recursively, without a sense of visual weight, and without a system-wide colour budget each item gets its own accent and the colours cancel out. — [Humble, Fountain Institute (date not shown on page)](https://pages.thefountaininstitute.com/posts/7-tells-that-a-ui-is-ai-generated)
- [OPINION] Capital & Compute (editorial byline, no named author) says tracked all-caps eyebrows above every heading are a template tell. Identical rounded cards with one soft shadow are another, and tabular content should be rows or tables. It advises varying radius and elevation by hierarchy, using 4–6 named colours with defined roles, and deleting any number you cannot source. — [Capital & Compute, Sept 2026](https://capitalandcompute.net/blog/fix-ai-slop-design/)
- [OPINION] The same piece says banning a look just moves the model to the next most probable look (cream with terracotta, or near-black with one neon accent). A filter removes defaults but cannot supply a direction. — [Capital & Compute](https://capitalandcompute.net/blog/fix-ai-slop-design/)

**Why it happens**
- Adam Wathan joked in August 2025 about his Tailwind `bg-indigo-500` default causing AI's purple habit. — [Alan West, DEV](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)
- [OPINION, not measured] The training-data feedback loop is widely repeated commentary. I found no research proving it. — [prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)
- [OPINION] Anthropic's own frontend-design skill reportedly names Inter, Roboto, Arial and purple-on-white gradients as generic. I only saw this through third-party copies, so verify before quoting. — [mcpservers.org copy](https://mcpservers.org/agent-skills/anthropic/frontend-design)

**The owner's feeling has a name**
- [OPINION] Rauno Freiberg (site attribution; the essay itself carries no byline) argues that novelty only registers against a familiar backdrop and that a ubiquitous style wears out. His summary: "Make most things familiar, do something unexpected." He also says routine-task users usually want restraint. — [Novelty, Feb 2026](https://rauno.me/craft/novelty)
- [OPINION] His piece on contrasting aesthetics says deliberate clashes suit first impressions and creative work, and are less suited to everyday productivity tools. — [Contrasting Aesthetics, Jan 2024](https://rauno.me/craft/contrasting-aesthetics)

### Inferences

**Tell-to-countermeasure checklist for the scouting app.** Evidence is noted in brackets. Everything in the "Do instead" column is my recommendation, built from the cited sources.

| Current trait | Why it reads as calculated | Do instead |
|---|---|---|
| Saturated navy header | Spends the whole colour budget on chrome, the least informative area (Humble's budget idea; Linear dims chrome). No critic I found names navy specifically. | Header in the same neutral as the page, or one step off it. No coloured band. Team name and match context as plain text. |
| Big numeric hero (4 : 2) | Same form as Bakaus's hero metric and Krebs's stat banner. In sport, though, the score is real content, so it may stay. The tell is the theatrical size and the absence of context. | Keep the score but size it down. Attach what a coach needs right beside it: set scores, opponent, date, "Satz 3 läuft". Let it sit in a line of text rather than alone in a tile. |
| Uppercase condensed headings everywhere | All-caps headings are a measured Krebs pattern. Uppercase is acceptable for short labels (Butterick, Bakaus), so "everywhere" is the problem, not uppercase itself. | Sentence case for all headings. Uppercase only for very short column heads or rotation tags, at most one role per screen. |
| Uniform spacing | Bakaus: equal gaps hide grouping. | Two or three distances with a clear ratio: tight inside a group, about double between groups, much larger between sections. Differing section gaps are correct, not sloppy. |
| Equal-width card grids | Bakaus: every point gets the same weight. Humble: containers applied without judgement. C&C: tabular content belongs in rows. | Width follows content: a wide player table beside a narrow notes column. Replace cards with rows and whitespace. Keep a box only where something is truly separate or interactive. |
| Tile rows of big numbers with small labels | Hero metric or stat banner again. Refactoring UI does endorse small, light labels on dashboards for scanning, so the pattern is legitimate when values are compared. The tell is using it as the default container. | Comparable values go into a table so the eye can scan down a column. Merge label and value where possible ("31 von 50 Aufschlägen"). Keep at most one or two truly leading numbers. |
| Strong blue and orange scheme | Humble: without a colour budget, colours cancel out. Two competing accents leave no signal for "this matters now". Near-complementary pairs also look textbook [INFERENCE]. | One accent only. Own team in the accent, opponent in neutral gray. Red, green and amber only for real states. See section 5. |
| Identical radius everywhere | Only partly a tell (C&C). Real products also use a narrow scale; see section 3. | Small scale such as 4/6/8 px, and larger only for big containers. Inner radius concentric with outer. |
| Decorative hairlines | Bakaus: hairline with wide shadow. Linear reduced and softened separators in 2026. | Separate with space first. Use row rules only in tables, and pick either border or shadow per edge. |
| Eyebrows and section labels | Bakaus, C&C. | Delete if they repeat the heading. |
| Coloured left-border cards | A designer quoted by Krebs calls them nearly as reliable a sign as em-dashes (anecdotal); Bakaus lists them too. | Remove them. Show state with text or an icon. |
| Fabricated-looking demo data | C&C: delete numbers you cannot source. Round demo numbers look generated [INFERENCE]. | Show real match data, including its quirks: missing values, long names, 0 %, "—", small samples (see section 2). |

- **Do not treat this list as the goal.** Linear uses Inter and Vercel uses Geist, both on Bakaus's overused list, and neither reads as AI-made. A tell is a correlation, so the real countermeasure is deciding from the content of each screen.
- **Avoid swapping into the next cliché.** Warm cream with an orange or terracotta accent is exactly the "second wave" look C&C warns about, and the app's existing orange makes that a tempting mistake.

### Gaps
- I found no named critic addressing saturated navy headers, condensed uppercase type, or sports score heroes specifically. The mappings above are inference.
- I found no controlled study of whether users perceive these traits as "AI-made". Krebs measures presence of patterns, not perception.
- Most catalogues are written by people selling or maintaining anti-slop tools, which is an obvious bias. No catalogue addresses dashboards or data-heavy product UI directly.
- "Perfect symmetry" appears only indirectly, through Krebs's centred hero. I found no source treating it as a general tell.

## 2. What makes UI feel human-made?

### Takeaway
The sources converge on content-led hierarchy, spacing that shows grouping, dimmed chrome, and many small corrections that are felt more than seen. Evidence here is almost entirely practitioner opinion, not user research.

### Cited Findings
- [OPINION] Refactoring UI: if a value explains itself (a price, an email), drop the label. Merging label and value into one phrase gives a single unit to style. On dashboards keep labels secondary so values stand out. On spec-like pages people search for the category first, so the label deserves more weight. Over-de-emphasis is a risk: a slightly darker label and slightly lighter value can be enough. — [Refactoring UI, Labels are a last resort](https://www.refactoringui.com/previews/labels-are-a-last-resort) (book from 2018, older than the requested range)
- [OPINION] Linear describes alignment work on labels, icons and buttons as subtle, something felt after minutes of use rather than noticed at once. — [Saarinen et al., March 2024](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [DOCS] Vercel: nudge an element by about 1px when it looks misaligned even if the geometry is correct. Align every element to something deliberate (grid, baseline, edge or optical centre). Balance weight, size, spacing and colour between adjacent text and icons. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)
- [DOCS] Vercel: design empty, sparse, dense and error states, and let layouts handle short, average and very long content. Use the true ellipsis character, curly quotes and non-breaking spaces for units such as "10 MB". — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)
- [OPINION] Jakub Krehel (author inferred from the domain; no date on the page): the outer radius equals the inner radius plus the padding. Use slightly less padding on the icon side of a button. Use `text-wrap: balance` on titles and `pretty` on paragraphs. Add a 1px outline at about 10% opacity on images. — [Details that make interfaces feel better](https://jakub.kr/writing/details-that-make-interfaces-feel-better)
- [OPINION] Freiberg: interfaces feel crafted when small, often unnoticed decisions are grounded in human instinct. Animation should be used sparingly on frequent actions, since repetition makes it a burden. — [Invisible Details of Interaction Design, July 2023](https://rauno.me/craft/interaction-design)
- [DOCS] Linear's redesign kept layouts tied to tasks: filters in headers, meta properties in side panels, teammates' faces emphasised and notifications grouped by type in the Inbox. — [Saarinen et al., March 2024](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Sources disagree on edges:
  - Vercel recommends combining borders and shadows, with semi-transparent borders. — [Vercel](https://vercel.com/design/guidelines)
  - Bakaus flags hairline plus wide shadow as redundant. — [Impeccable](https://impeccable.style/slop?cb=30)
  - Krehel prefers layered shadows over borders. — [Krehel](https://jakub.kr/writing/details-that-make-interfaces-feel-better)

### Inferences
- **Uneven rhythm should come from content, not randomness.** Deliberately irregular values would be another calculation. Spacing should differ because the grouping differs.
- **Real data is the cheapest source of humanity in a scouting app.** A player with 3 attempts should look different from one with 80. Show sample size, allow "—", and let long names wrap or truncate properly. Do not make every table row and tile come out the same shape. Vercel's rule on handling all content lengths and states supports this.
- **Density should vary by task.** The live-entry screen needs large targets and little text. The post-match analysis screen can be dense like a spreadsheet. A single uniform density across both is itself a sign of a template.
- **On edges,** the disagreement mostly resolves by context: use no edge where space works, a translucent border in dense lists, and a light layered shadow only on things that float, such as menus and dialogs. This is my synthesis, not any source's rule.

### Gaps
- No user study found that links these details to perceived "human-made" quality. Claims are practitioner judgement.
- The primary text of the 37signals "simple design" post could not be retrieved (HTTP 404), so its principles are not included. Its existence is noted [here](https://notes.baldurbjarnason.com/2020/07/09/how-we-achieve.html).

## 3. Concrete craft details from real products

### Takeaway
Documented and measured values show tight, unglamorous systems: UI text at 13–14 px, small component radii (4–8 px), very low contrast between surface levels, and few uppercase declarations in CSS. Vercel and Stripe also declare tabular numerals repeatedly (22× and 10×; Linear's site only 2×). Linear's 2024 and 2026 redesigns both moved further from blue and further from chrome.

### Cited Findings

**Linear, documented**
- [DOCS] 2024: moved theme generation from HSL to LCH and cut theme definitions from 98 variables to 3 (base colour, accent, contrast). It deliberately limited how much chrome blue enters the colour calculation, to keep the look neutral and timeless. Inter Display for headings, regular Inter elsewhere. Figma exploration was built on opacities of black and white. — [Saarinen et al., March 2024](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [DOCS] 2026: moved default light and dark from a cool, blue-ish palette to a warmer, less saturated gray, while watching that it did not turn muddy. Sidebar made dimmer so content takes precedence. Tab bar made more compact. Fewer and smaller icons in some views. Coloured team icon backgrounds removed. Separators reduced, rounded and softened. — [Aufmann & Heckel, March 2026](https://linear.app/now/behind-the-latest-design-refresh)

**Linear, measured from linear.app CSS** ([MY MEASUREMENT]; marketing site tokens, default dark theme; these may predate or differ from the app's 2026 warm gray) — [linear.app](https://linear.app)
- Surfaces: `#08090a`, `#0f1011`, `#141516`, `#191a1b`. Each step is only about 5–7 levels per channel.
- Text: primary `#f7f8f8`, secondary `#d0d6e0`, tertiary `#8a8f98`, quaternary `#62666d`. Contrast on `#08090a` is 18.7, 13.6, 6.1 and 3.5:1.
- Borders: `#23252a`, `#34343a`, `#3e3e44`, plus translucent white at about 5% (`#ffffff0d`) and about 8% (`#ffffff14`). The primary border has only 1.3:1 against the background.
- Accent: `#7170ff`, brand background `#5e6ad2`.
- Weights: 400, 510, 590, 680 (variable font, off the usual 100 grid).
- Literal sizes found: 12, 13, 15, 16, 18 px (only about 2× each, since most sizes are set through variables, so this is thin evidence). Line heights: 16 and 20 px dominate. Radii: 6 px (7×), 8 px (5×), then 4, 10 and 20 px (2× each). Tracking: mostly slightly negative, about −0.01 to −0.02 em.

**Vercel**
- [DOCS] Geist: Label 14 is the most common style in menus. Copy 14 is the most common multi-line text. Label 13 is for secondary lines and should use tabular figures for numbers. Label 12 is tertiary text in busy views. — [Geist Typography](https://vercel.com/geist/typography)
- [DOCS] Geist's scale gives each step a job: backgrounds 100 and 200 (use 200 sparingly); component backgrounds gray-100 / 200 / 300 for default, hover, active; borders gray-400 / 500 / 600; text gray-900 and gray-1000. Solid gray is the default; the alpha variant is only for edges that must blend. — [Geist Colors](https://vercel.com/geist/colors)
- [MY MEASUREMENT] From vercel.com CSS (light theme): background 100%/98% lightness, gray-100 95%, gray-400 92%, gray-900 30%, gray-1000 9%, all at 0% saturation. Blue-700 is `#0070f7`. Most frequent sizes are 14 px (52×), 16, 20, 13, 18, 24, 12. Most frequent weights 550 (109×) and 450 (54×). Radius variables are 6 px, with 8 px for marketing. `tabular-nums` or `tnum` appears 22×. — [vercel.com](https://vercel.com)

**Stripe**
- [DOCS] Rebuilt its palette because HSL lightness is not perceptual (yellows look lighter, blues darker). It used CIELAB so any two colours at least five levels apart meet small-text contrast and four levels apart suit icons and large text. — [Koopersmith & Miner, 2019](https://stripe.com/blog/accessible-color-systems) (older than the requested range, still the primary source)
- [MY MEASUREMENT] stripe.com: font `sohne-var` (commercial). Common radii 4 px (16×), 3 and 5 px, with `--card-radius-inner: 5px`. Tracking −0.01 to −0.02 em. `tabular` or `tnum` appears 10×. Its CSS also defines many gradient accent tokens, so its marketing site is not a model of restraint. I did not assess the Dashboard. — [stripe.com](https://stripe.com)

**Things, Basecamp, Notion**
- [MY MEASUREMENT] Things' website uses a pure system stack, `ui-sans-serif,-apple-system,BlinkMacSystemFont,Roboto,sans-serif`, with sizes of 13–18 px and radii of 3–16 px (6 px is most frequent). It shows a respected product can present well with no web font. — [culturedcode.com/things](https://culturedcode.com/things/)
- [MY MEASUREMENT] Basecamp's site CSS defines variables named `--font-family-martian-mono` and `--font-family-sharpie`, a monospace plus what the name suggests is a marker face. That visible hand-made gesture is the opposite of grid-perfect polish. I did not view it rendered. — [basecamp.com](https://basecamp.com)
- [MY MEASUREMENT] Notion's site uses radii of 12 px (7×), 4, 6 and 8 px, with 14 and 12 px as its common small sizes. A teal accent variable exists, but this tells us little about the app. — [notion.com](https://www.notion.com)

**Uppercase across all six sites**
- [MY MEASUREMENT] `text-transform: uppercase` declarations found in fetched CSS and HTML: Linear 5, Vercel 4, Notion 2, Stripe 1, Basecamp 1, Things 1. These are small numbers against up to about 1.6 MB of HTML and CSS per site. It is a weak proxy, because a utility class is declared once however often it is used, and I did not check rendered pages.

### Inferences
- **"Too calculated" is not about precision.** Linear, Vercel and Stripe are extremely systematic. The difference is what the system is spent on: quiet surfaces and exact text roles, rather than visible decoration. Being systematic is fine, but the system should not be the thing you see.
- **Surface contrast is far subtler than most generated UIs use.** Adjacent Linear surfaces differ by only about 5–7 levels per channel, and borders are 1.3:1. Hierarchy comes from text contrast tiers.
- **A practical default for the app:** 13–14 px for table and UI text, 16–20 px for section heads, two to three weights, and 4–8 px radii.

### Gaps
- **Superhuman:** no usable craft data collected.
- **Things and Basecamp app UIs:** no first-party written design details found; only their websites were measured.
- **Stripe Dashboard and Linear in-app tables:** no published row heights, cell padding or table specs found. Logged-in UIs were deliberately not inspected.
- Emil Kowalski's writing was not retrieved, so it is not represented here.

## 4. Typography for data-heavy UI without web fonts

### Takeaway
`system-ui` is a sound base: it is legible and looks native on each platform, provided `tabular-nums` is set, because SF's default digits are measurably proportional. DIN Condensed is the problematic choice: it has only one weight on this Mac, I could not verify it as a cross-platform font, and it pushes the app towards a scoreboard look (that last point is my judgement).

### Cited Findings

**Measured font facts** ([MY MEASUREMENT], from font files on this Mac; advances read at the default instance)
- **DIN Condensed:** the only file present is `DIN Condensed Bold.ttf`. So every requested weight renders from this one Bold file, and hierarchy by weight is impossible. All digits have the same width (0.372 em), so it is tabular by nature. There is no `tnum`, `pnum`, `lnum`, `onum`, `smcp` or `c2sc` feature, so CSS numeric and small-caps features do nothing. Its zero is about 39% narrower than SF's.
- **DIN Alternate:** also Bold only (`DIN Alternate Bold.ttf`), equal-width digits (0.48 em), no OpenType number features.
- **SF (`SFNS.ttf`):** variable font. Default digits are **not** equal width: "1" = 908 units vs "6" and "9" = 1264 of 2048, a 28% spread, so a column of numbers will not align without `tabular-nums`. It has `tnum` and `pnum`, and also `smcp` and `c2sc` feature tags, so true small caps should be available (feature tags confirmed, rendering not tested).
- **SF Mono (`SFNSMono.ttf`):** equal-width digits.

**Cross-platform**
- [MEASURED by the author, one blog] Some Segoe UI weights default to tabular figures and others to proportional. The standard weight was tabular and Semilight proportional. — [yuo.be, 2024](https://blog.yuo.be/2024/07/20/segoe-ui-tabular-figures-and-directwrite/); an [ASP.NET blog post](https://weblogs.asp.net/rweigelt/archive/2022/11) describes all Segoe UI digits as equal width, which conflicts for lighter weights.
- [DOCS] Modern Font Stacks recommends `system-ui, sans-serif`, describing it as highly legible at small sizes with many weights. It resolves to San Francisco, Segoe UI, Roboto, Ubuntu, Cantarell or Noto Sans depending on the OS. — [Modern Font Stacks](https://github.com/system-fonts/modern-font-stacks)
- [DOCS] Its "Industrial" stack for a DIN-like look is `Bahnschrift, 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif-condensed, sans-serif`. It warns weight support is limited, so it works best at Medium or Bold for display use. Note that this stack lists DIN Alternate rather than DIN Condensed. — [Modern Font Stacks](https://github.com/system-fonts/modern-font-stacks)
- [DOCS] The same project says the name "Roboto" does not render on Android, where the generic `sans-serif` is used. — [Modern Font Stacks](https://github.com/system-fonts/modern-font-stacks)
- [DOCS] Default digit width varies by font and cannot be assumed. — [Preuss Type on tnum](https://preusstype.com/techdata/otf_tnum.php)

**Which fonts look good or generic**
- [OPINION] Matthew Butterick (for print, not UI): Helvetica on his A list, Segoe UI and Calibri on B, Times New Roman on C. Arial on his F list, as a bland Helvetica substitute and the sans of last resort. — [Practical Typography, system fonts](https://practicaltypography.com/system-fonts.html)
- [OPINION] Bakaus lists Inter and Geist as overused, and Anthropic's skill reportedly lists Inter, Roboto and Arial. Linear and Vercel still use Inter and Geist to good effect, so overuse is not fatal when the rest is considered. — [Impeccable](https://impeccable.style/slop?cb=30); [Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [MY MEASUREMENT] Things' website uses a system stack. — [culturedcode.com/things](https://culturedcode.com/things/)

**Numbers, weight, uppercase**
- [DOCS] Vercel: use tabular numerals or a monospace font for numbers in comparisons. — [Vercel guidelines](https://vercel.com/design/guidelines)
- [OPINION] Krehel notes that `tabular-nums` changes how numerals look in some fonts, such as Inter. — [Krehel](https://jakub.kr/writing/details-that-make-interfaces-feel-better)
- [DOCS] MDN: `tabular-nums` maps to the OpenType `tnum` feature and `proportional-nums` to `pnum`. — [MDN font-variant-numeric](https://developer.mozilla.org/docs/Web/CSS/font-variant-numeric)
- [OPINION] Butterick accepts caps for headings shorter than one line, labels, captions and small sizes. He says to always add letterspacing and keep it under one line, and gives no specific amount. — [Practical Typography, all caps](https://practicaltypography.com/all-caps.html)
- [MY MEASUREMENT] Vercel's most frequent weights are 550 and 450, and Linear's medium is 510, both variable-font values. Tracking on UI text is slightly negative (see section 3).

### Inferences

**Recommended rules for the app (my synthesis, not sourced as a set):**
```css
body   { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         font-size: 14px; line-height: 20px; }
table, .num { font-variant-numeric: tabular-nums lining-nums; }
th.num, td.num { text-align: right; }
h1 { font-size: 20px; line-height: 28px; font-weight: 600; }
h2 { font-size: 15px; line-height: 20px; font-weight: 600; }
.meta { font-size: 13px; line-height: 18px; color: var(--text-2); }
```
- **Remove DIN Condensed as the default.** If the owner wants character, use it for at most one element, such as the score, with a fallback. Where it is missing (Windows and Android should be assumed not to have it), a normal-width fallback takes far more horizontal space, so that element must be tested for overflow.
- **Weights:** 400 and 600 are enough; add 500 only with a reason. Avoid fine-grained weights such as 510. They suit a variable font like Linear's Inter, but on a system stack with static font files they would snap to the nearest available weight, so the result could differ by platform (not tested).
- **Hierarchy:** use size only a little. Most hierarchy should come from text colour tier and weight.
- **Uppercase is suitable for:** table column heads of one or two words if they are truly dense (11–12 px with about 0.04–0.06 em tracking), established volleyball codes (MB, OH, L, S), and nothing else. Sentence case works for almost all column heads too. The tracking figures are my starting values, as Butterick gives no number.
- **Small type:** Bakaus flags tiny interface text, so avoid going below 12 px except for rare details.
- **Segoe UI caution:** do not use Semilight for numbers. Set `tabular-nums` everywhere numbers appear, and test on Windows.

### Gaps
- **Roboto default digit behaviour:** no source found. Verify in the font file or by rendering on Android. I believe it is tabular, but that is unverified.
- **DIN Condensed on iOS and Android:** only an anecdotal [Apple forum thread](https://developer.apple.com/forums/thread/43199) and an unreliable font list were found. It is present on this Mac. Availability on iOS should be tested on a device, and Android and Windows should be assumed not to have it. Modern Font Stacks lists Bahnschrift as the Windows counterpart.
- **Bahnschrift rendering and metrics** were not measured (no Windows machine).
- Segoe UI has not been verified from its font files. The evidence is one blog against one conflicting post.

## 5. Colour: neutral palette with one restrained accent, and dark mode without navy

### Takeaway
Greys do most of the work, and the accent marks only action or selection. Dark mode should be a near-neutral dark grey, lightening slightly with elevation. Linear's own direction since 2024 has been to reduce blue, and in 2026 it moved towards warmer, less saturated grays.

### Cited Findings
- [OPINION] Refactoring UI: greys cover text, backgrounds, panels and controls, so plan 8–10 shades. Avoid true black and start from a very dark grey. Use one or at most two primary colours, plus sparing accents for semantic states (red destructive, yellow warning, green positive). Complex UIs with categories, such as graph lines, may need more. — [Refactoring UI, Building your colour palette](https://www.refactoringui.com/previews/building-your-color-palette)
- [DOCS] Radix 12-step scale: 1–2 app and subtle backgrounds; 3/4/5 component normal, hover, pressed; 6/7/8 subtle border, interactive border, strong border and focus; 9/10 solid and hover; 11/12 low- and high-contrast text. Steps 11 and 12 are guaranteed Lc 60 and Lc 90 APCA on step 2 of the same scale. Step 9 has the highest chroma. — [Radix, Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [DOCS] Radix offers plain gray, or tinted slate (blue), sage (green), olive (lime), sand (yellow), mauve (purple). The closest tint to your accent feels more harmonious, plain gray suits any hue, and a saturated gray can clash, especially in dark mode with many colourful components. Use the gray scale for text in functional apps and accent-coloured text for more colourful pages such as marketing. — [Radix, Composing a palette](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)
- [DOCS] Vercel: tint borders, shadows and text toward the hue on non-neutral backgrounds. Do not rely on colour alone for status; include text labels. Use colour-blind-friendly chart palettes. Prefer APCA. Set `color-scheme: dark` in dark themes. — [Vercel guidelines](https://vercel.com/design/guidelines)
- [OPINION] Humble: a system-wide colour budget. Coloured status dots should be reserved for meaningful states such as live or connected, and otherwise use a text label. — [Humble](https://pages.thefountaininstitute.com/posts/7-tells-that-a-ui-is-ai-generated)
- [DOCS] Linear 2024: limited chrome blue in calculations to keep it neutral. Linear 2026: warmer, less saturated gray, with a warning that too warm turns muddy. — [2024](https://linear.app/now/how-we-redesigned-the-linear-ui); [2026](https://linear.app/now/behind-the-latest-design-refresh)
- [MY MEASUREMENT] Linear's tokens are nearly neutral dark (`#08090a`) with a slight cool lean, and secondary text `#d0d6e0` is visibly cooler. Vercel's light grays are at 0% saturation. — [linear.app](https://linear.app); [vercel.com](https://vercel.com)
- [OPINION, low-quality sources] Secondary guides state that surfaces should get lighter with elevation because shadows barely show on dark backgrounds, and that a single dark grey for all surfaces looks flat. `#121212` is commonly cited, but I could not retrieve Material's primary page to confirm it. Claims about OLED smearing with pure black come from design blogs and should not be presented as established fact. — [UI/UX Atlas](https://uiux-atlas.pages.dev/lessons/color/dark-mode-design); [colorpick](https://colorpick-io.pages.dev/learn/dark-mode-design)
- [OPINION] C&C warns against near-black with one neon accent, and Humble and Bakaus flag glowing accents. So the accent in dark mode must be calm. — [C&C](https://capitalandcompute.net/blog/fix-ai-slop-design/); [Impeccable](https://impeccable.style/slop?cb=30)

### Inferences

**Accent discipline for the app:**
- Allowed accent uses: selected tab or filter, primary button, links, the own team's data series. Roughly 5% of the screen is a useful target; this figure is my rule of thumb and is not measured.
- Remove blue and orange as competing brand colours. Keep one, and I would keep **blue**, because orange near cream or dark is the second-wave cliché and orange collides with warning states.
- Opponent: neutral gray rather than a second brand colour. In a chart this gives an immediate "us versus them" reading.
- Performance colour (good or bad) should be sparing and paired with a sign or text, for example +3 / −2, not filled tiles.
- Avoid Tailwind's `indigo-500`, the default critics point to, and do not use gradients.

**Starting palette (my proposal, contrast computed by me, not taken from any product):**

| Role | Light | Contrast | Dark | Contrast |
|---|---|---|---|---|
| Page | `#f7f7f6` | – | `#111214` | – |
| Raised surface | `#ffffff` | – | `#1b1c1f` | – |
| Border | `#e4e4e2` | 1.27 on white | `#2a2b2f` | 1.33 on page |
| Text primary | `#1a1b1d` | 16.1 on page | `#e9eaec` | 15.6 on page |
| Text secondary | `#55585e` | 6.7 on page | `#a3a6ac` | 7.7 on page, 7.0 on raised |
| Text tertiary | `#6f7278` | 4.5 on page, 4.8 on white | `#85888f` | 5.3 on page, 4.8 on raised |
| Accent | `#1f5fbf` | 5.7 on page; white on it 6.1 | `#6fa3f0` | 7.3 on page, 6.6 on raised |

Contrast values are WCAG 2 ratios. Light borders at about 1.3:1 match what Linear does, but they are decorative only. From my own knowledge of WCAG 1.4.11 (I could not open the [W3C page](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html) to confirm it), control boundaries needed to identify a control should reach 3:1, so inputs need a stronger border. In dark mode, the accent is lighter and less saturated than the light-mode accent so that it does not glow.

- **Why not navy:** a navy page is a saturated gray, and Radix warns that these clash in dark mode with many coloured components, which applies to a scouting screen with team and status colours. It also reads as a theme instead of a working surface. The link from Radix's warning to navy specifically is my inference.
- **Elevation:** make each level a few points lighter, as in Linear's token steps, without shadows on regular panels.

### Gaps
- Material Design's primary dark-theme values (surface colour, overlay percentages) could not be retrieved; the page returned only a title. Do not cite the exact percentages from memory.
- No published data on the share of screen area that accent colour occupies in Linear, Stripe and others. It would take screenshot analysis of logged-in apps, which was out of bounds.
- Colour-blind behaviour of the final palette has not been tested, although I would expect a blue-versus-gray pairing to be safer than red versus green (my expectation, not tested).
- Linear's current light-theme and 2026 warm gray values were not extractable from the marketing site.

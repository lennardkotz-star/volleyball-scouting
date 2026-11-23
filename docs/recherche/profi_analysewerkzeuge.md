# Visual and interaction design of professional sports analysis and video tools, and the volleyball scouting tradition

Research date: 2026-11-04.

Evidence tags used throughout:
- **[OBS]** I looked at the actual screenshot, document scan or live page in this session. Colours marked ≈ are judged by eye, not pixel-sampled.
- **[CSS]** Read from the live stylesheet or computed style of the page, so the value is exact.
- **[DOC]** Stated in vendor documentation, a rulebook or a store listing. I did not verify it visually.
- **[INF]** My inference. It is not a sourced fact.

Age warning: the richest DataVolley material is the DV2007 handbook, about 20 years old. It is valuable as the origin of the conventions. The DV4 product-page images and the 2026/27 VBL codebook show which of them survive. Hudl Uniform's footer says 2016-2020, so treat it as a possibly legacy system, although `#232a31` is still the body text colour on hudl.com today.

## What does the scouting input screen look like? How are rallies, code line, skills, grades, rotations, court and zones shown?

### Takeaway
The professional standard is a keyboard-first screen with one empty text line for typing, a vertical running list of normalised codes, and a small scoreboard-plus-rotation panel. The court is a status display, not the main stage. Tablet tools (Click&Scout, SoloStats) invert this: they tap on a court or player buttons, and accept less detail in return.

### Cited Findings

**Window anatomy of DataVolley**
- [DOC] The handbook names the core windows: Rotation/Scoreboard window (generally centre), Scouting window (a single editable row, generally at the bottom), Codes list (vertical, generally on the right), Command window and Quick command window — [DV2007 handbook §1.8](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] DV2007 Professional live screen, 1240×766: Windows menu bar, then a black match strip with match, competition, venue, date, start time and set scores separated by pipes (for example `| 25-21 | 27-25 | 22-25 | 25-18 |`). Below that, floating windows sit on a dark maroon desktop (≈#4F0000) — [handbook, screenshot](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] Enter stores the typed codes. Esc always returns to the scouting line. Page Up jumps into the codes list. Enter on a code edits it. The code list has Update, Verify and Search buttons, and Verify checks the logical action sequence and whether the player is on court — [handbook §1.8.2-1.8.3](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] The end of a rally is a separate key, not Enter: End Rally left and End Rally right award the point, change service and rotate, and the next server's number is pre-filled into the input line. Undo restores the previous digits into the same line — [handbook §1.10.6-1.10.7](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] The key remapping dialog shows default bindings: `a` prefix for away, `*` prefix for home, `<` and `,` for End Rally left and right, F2/F3 and F6/F7 for points ±, F4/F5 and F8/F9 for rotation ± — [handbook screenshot](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] Default parameters minimise typing. Typing only `7` and Enter yields `07AH+`, because skill, type and grade fall back to defaults — [handbook §1.10.4](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)

**The code line**
- [DOC] A main code is team + player number + skill + type + evaluation: home `*` (auto-added) or away `a`, then two digits, then one letter each. An advanced code adds up to three further entries. Codes are not separated internally; a space separates two touches (`5SH+16 a6AV#41A`) — [handbook §1.10.3, §1.10.5](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] Skill letters: S serve, R reception, E set, A attack, B block, D dig, F free ball. Type letters: H high, M medium, Q quick, T tense, U super, F fast, O other — [handbook §1.10.3](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] Compound or "dot" coding joins serve with reception and attack with block or dig, so each pair is typed once. VolleyStation's example is `*12SQ61.3#` — [VolleyStation coding guide](https://volleystation.freshdesk.com/support/solutions/articles/103000267038)
- [DOC] VolleyStation commands: `P`/`aP` point, `Z1`/`aZ1` setter in zone 1, `C1:2`/`aC1:2` substitution, `T`/`aT` time-out — [VolleyStation coding guide](https://volleystation.freshdesk.com/support/solutions/articles/103000267038)
- [OBS] Real rows from a DV code list: `*p24:17` (bold point row), `az5` (rotation), `*c18:08` (substitution), `*07SQ+`, `*15RM#`, `*13AQ#X747`, `*04EQ+K7C`, `a01RQ+96`, `*$$&H=`, `*T`, `**4set` — [handbook screenshots](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] The codes list has columns `Main | Advanced | Extnd`, then narrow `S` (set), `Timecode` and `F`. Point and rotation rows are orange (≈#FFD79B), with the point rows in bold so they act as rally separators. Touches are pale yellow (≈#FFFFB0), and the `**4set` row is salmon. Text is dark blue by default, lighter blue for substitution rows and green for `$$` rows, with a black arrow as row cursor — [handbook screenshots](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] DV4 code editor: a one-row form with one narrow cell per code position. Main headers are dark red (`* N. Sk Ty ±`) and advanced headers are blue (`Cmb SB sz ez e+`), with dropdowns such as `1 - zone 1` — [DV4 video-analysis image](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/video-analysis.png)

**Grades**
- [DOC] `=` is always error and `#` is always the best. The middle symbols change meaning per skill. On serve, `/` is good (poor reception by the opponent). On attack, `/` means blocked for a point against. On block, `/` is a net violation. On reception, `/` is an overpass or poor pass — [handbook §1.10.3](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf); [VolleyStation coding guide](https://volleystation.freshdesk.com/support/solutions/articles/103000267038)
- [DOC] `!` is a custom character in the 2007 handbook. It is defined in current usage: reception within the 3 m or dashed-circle area, and on attack a blocked ball recovered by the attacking team — [VBL/DVV Codebook 2026/27](https://rtk.volleyball.sport-iat.de/fileadmin/user_upload/DVV-Volleyball/26-05-18_Codebook_2027.pdf)
- [DOC] VolleyStation's guide gives reception grades a numeric scale: # 4, + 3, ! 2, - 1, / 0.5, = 0 — [VolleyStation coding guide](https://volleystation.freshdesk.com/support/solutions/articles/103000267038)
- [DOC] The DVV/VBL codebook has an explicit philosophy of minimising scout judgement: only first-touch quality, some setter-call grey areas and block/defence at rally end remain judgement calls. Definitions of VolleyMetrics grades differ from standard DataVolley, so readers need a separate decode option — [Codebook](https://rtk.volleyball.sport-iat.de/fileadmin/user_upload/DVV-Volleyball/26-05-18_Codebook_2027.pdf); [openvolley datavolley](https://openvolley.r-universe.dev/datavolley/doc/datavolley.html)

**Scoreboard and rotation panel**
- [DOC] The panel always shows both rosters, both sextets, setter in a contrasting number, libero in yellow, a white ball for service possession, current and previous set scores, substitutions (C) and time-outs (T). It can flip between horizontal and vertical, swap sides and collapse the rosters — [handbook §1.8.1](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] DV2007 panel: LED-style black digit tiles for C, TO and Pts, set counts in red-outlined tiles, team name chips (home lavender with navy text, away salmon with red text and an `a ` prefix). Court ≈#F5A77E on a blue surround ≈#6C9BEE, thick black net, thin white attack and zone lines. Players are circles with team-tinted numbers. Big yellow numerals beside the court match the libero highlighted in the roster — [handbook screenshot](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] DV4 scouting window, much flatter: black title bar reading `Set 4`, grey left icon rail, red team chip (≈#E8392B) and navy chip (≈#000080), `C1 T2` chips, large white score on team-colour tiles with tiny +/- beside them. A vertical grey court holds solid team-colour circles, with the setter as a white circle with coloured number. Rosters are plain number-and-name columns with yellow `10L` chips. Bottom row: `Pt` button, white input, `Pt` button, `Undo` — [DV4 scouting window image](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/blocco1-1_Finestra%20rilevazione.png)
- [DOC] DV identifies a rotation by the setter's position, so tables read "Setter in 1", "S1" and so on — [handbook report legend](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] Rotation lists are usually in the order the setter travels, not 1-6: `Setter in 1, 6, 5, 4, 3, 2` in DV4 Rotations Search, and `S1 S6 S5 S4 S3` across the distribution view. Yet the printed match report uses 6-to-1 — [DV4 video-analysis](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/video-analysis.png); [DV4 distribution](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/blocco3-2_Distribution.png)

**Rally views**
- [OBS] DV2007 "Action detail": one row per rally with score in the first column and every code laid out left to right in its own column; some rally-ending codes are tinted green or red. It is a very compact way to read a whole set — [handbook screenshot](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] Clicking a code opens a small court showing that action's rotation, where trajectories can be traced with three points — [handbook "new features"](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] VolleyStation Pro: browser-style tabs (match, report or spreadsheet, Cmd/Ctrl+T, W, 1-9), a Rotation Planner, Bench Mode for tablets, dual coding by two scouts with real-time sync, and a "One Rally Before" filter — [VolleyStation differences article](https://volleystation.freshdesk.com/support/solutions/articles/103000356203-9-main-differences-between-dv-and-vs-pro)
- [DOC] VolleyStation has a configurable "Match Flow" table that marks out-of-sequence plays as errors; DV4 has no exact counterpart — [Codebook §0.4](https://rtk.volleyball.sport-iat.de/fileadmin/user_upload/DVV-Volleyball/26-05-18_Codebook_2027.pdf)

**Tablet variants**
- [OBS] Click&Scout (iPad, developer now listed as Genius Sports Italy Srl): landscape court ≈#F0A868 on periwinkle ≈#7A9DF0 with dashed zone lines and a huge vertical phase word (`Reception`). Tall vertical `TO`, `SUB`, `Point` buttons sit on both flanks. Left rail: glossy code chips, blue home, magenta away, black for points. Bottom: `J F JF` serve types, `# + - ! / =` grade keys (`#` dark, middle grades green, `=` red), and the last codes as chips with a red `Undo`. Right rail: `S1 S6 S5 S4 S3 S2` — [App Store screenshot](https://apps.apple.com/us/app/click-scout-eng/id577453400)
- [DOC] Click&Scout's direction colours: last direction drawn as the bigger arrow; black for a point scored, green if the rally continues, red if the point went to the other team. Players auto-position into reception and attack schemes, so the scout does not have to remember numbers — [App Store listing](https://apps.apple.com/us/app/click-scout-eng/id577453400)
- [DOC] SoloStats Live: thumb-based input in landscape on phone, with key players placed under the thumbs so the scout can stat "heads up"; unlimited undo, automatic score and rotation, a last-stat-entry indicator — [App Store listing](https://apps.apple.com/us/app/solostats-live/id1132326165)
- [DOC] Hudl/Balltime inverts input altogether: AI identifies touches and players, and the human edits them. Contacts are edited via a quick edit panel, with List, Grid and Timeline views — [Hudl navigate video](https://www.hudl.com/support/hudl-volleyball/guides/navigate-video)

### Inferences
- [INF] The strongest "real tool" signals to copy are: one typing line always focused, a list of raw codes in monospace, a separate end-rally action, and the next server pre-filled. A big decorative court in the centre reads as a concept, not a tool.
- [INF] Grade colours must depend on skill and outcome, not the glyph alone, because `/` is good on a serve and bad on an attack. Only `#` and `=` can be safely fixed.
- [INF] Show the raw code beside any friendly label. Coaches who know DV read `*15RM#` faster than a sentence, and it signals authenticity at once.
- [INF] `*$$&H=` appears to be a placeholder for an unknown player or implied action; I did not confirm this exact meaning in the text read.

### Gaps
- I could not view any Volleyball Scout product (several similarly named apps exist, and search found no authoritative page). It is not covered.
- No VolleyMetrics input or portal screenshot was found. VolleyMetrics is a coding service, and pages found were marketing copy.
- I did not obtain a screenshot of VolleyStation's live match screen; its coding guide does not describe the layout beyond the court image used for drawing direction arrows.
- DV4 images on the vendor page are heavily zoomed marketing composites, so overall full-screen layout in DV4 is partly inferred. No 2026 full-screen DV4 capture was seen.

## How do analysis tools render statistics tables, heat maps, attack charts and shot maps? Which court drawings look professional, and what are the proportions?

### Takeaway
Volleyball reports favour numbers inside court cells and hairline tables, with few colours used semantically. Football analysis favours very restrained pitches with thin grey lines and small dots. A court drawn at true FIVB proportions with thin lines and the 3 m line reads as professional; gradients, glow and thick rounded outlines do not.

### Cited Findings

**FIVB geometry (primary source)**
- [DOC] Court 18 × 9 m, divided by the axis of the centre line into two 9 × 9 m courts. Free zone minimum 3 m; for FIVB, World and Official competitions 5 m from side lines and 6.5 m from end lines — [FIVB Rules 2025-2028, rule 1.1](https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf)
- [DOC] All lines 5 cm wide. Side and end lines are drawn inside the court dimensions. The attack line's rear edge is 3 m from the centre-line axis, and for top competitions it continues outside the court as five 15 cm dashes, 5 cm wide, 20 cm apart, to a total 1.75 m — [FIVB rule 1.3](https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf)
- [DOC] Service zone is 9 m wide behind each end line, marked by two 15 cm short lines 20 cm behind the end line — [FIVB rule 1.4.2](https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf)
- [DOC] White lines at top level; court and free zone must differ in colour; front and back zones may differ; the indoor playing court must be light-coloured — [FIVB rule 1.2.2](https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf)

**Zone grid**
- [DOC] DataVolley uses 9 zones of 3 × 3 m, each with 4 subzones A-D. Own half with the net at the top reads, left to right: `4 3 2 / 7 8 9 / 5 6 1`. The opposite half is rotated 180°, so from the far baseline down to the net it reads `1 6 5 / 9 8 7 / 2 3 4` — [openvolley `dv_court` coordinates](https://openvolley.r-universe.dev/datavolley/doc/manual.html); [VolleyStation zones](https://volleystation.freshdesk.com/support/solutions/articles/103000031804-zones-and-subzones)
- [DOC] Serving locations only use 1, 5, 6, 7 and 9. openvolley's plotting grid places the corners at (0.5, 0.5) and (3.5, 6.5) with the net at y = 3.5 — [openvolley manual](https://openvolley.r-universe.dev/datavolley/doc/manual.html); [Codebook §1.1](https://rtk.volleyball.sport-iat.de/fileadmin/user_upload/DVV-Volleyball/26-05-18_Codebook_2027.pdf)
- [DOC] Sub-zones are written as `6A`, `9C`, `3B`. The codebook says start and end zones are coded by clicking coordinates. Attack targets for deflections are recorded where the attacker aimed — [Codebook §3.2, §4.4](https://rtk.volleyball.sport-iat.de/fileadmin/user_upload/DVV-Volleyball/26-05-18_Codebook_2027.pdf)
- [DOC] Cones are an alternative to zones for attack landing (diagonal, sharp diagonal, parallel), and openvolley models them as per-start-zone polygons numbered 1-7 — [handbook](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf); [openvolley manual](https://openvolley.r-universe.dev/datavolley/doc/manual.html)
- [OBS] VolleyStation's setter filter is a plain 2×3 grid of squares labelled `Z4 Z3 Z2 / Z5 Z6 Z1`, with selected cells in pale blue with a blue outline, one grid per team — [VS blog](https://blog.volleystation.com/new-rotation-and-player-filtering/)

**Statistics tables**
- [OBS] DV screens (2007 and DV4): header band in periwinkle ≈#7F7FB5 with white text, grouped column headers over sub-headers (`Tot = - + # #% Ind E%`), grey frozen name column ≈#D4D4D4, numeric cells right-aligned at small type, tabular digit look. Zero or absent values are a centred `.` or `-`, rather than `0`, so the eye jumps to non-empty cells. Red hairlines separate each skill or rotation group. 2007 uses pale yellow number cells, DV4 white — [handbook](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf); [DV4 analysis image](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/blocco2-1_Analysis-base.png)
- [OBS] One grade per column pair: count then `%` (`= % BP pS | / % BP | - % | ! % | + % | # % BP pS`), with `Ind` (index) and `*E%` efficiency next to the name. Team row first, then players by jersey number — [handbook "Stats ordered by Skill"](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] SoloStats report: white table with grouped headers (`Match | Serve | Blocks`), blue header cells (≈#2F6FE0), purple for the identity columns, pink highlight on `Err`, and black hairline grid. Columns such as `Atts Rating Err 1-Serve 2-Serve 3-Serve Aces Points Won PtScore %` — [App Store screenshot](https://apps.apple.com/us/app/solostats-live/id1132326165)
- [DOC] Hudl's Grid view is a spreadsheet below the player, with columns such as result, quality, score, zones, speed, height, phase and video time — [Hudl navigate video](https://www.hudl.com/support/hudl-volleyball/guides/navigate-video)
- [DOC] Linked stats: clicking a number shows the clips behind it. Hudl's six reports: Team Stats, Athlete Stats, Attack Tendencies, Rotations, Setter Tendencies, Trends — [Hudl explore guide](https://www.hudl.com/support/hudl-volleyball/guides/explore)
- [DOC] Sportscode Code Matrix is a 2D grid of timeline rows against labels, with cells counting instances; double-clicking a row name creates a movie — [Sportscode manual](https://www.hudl.com/support/manuals/sportscode/review-and-analyze/code-matrix/using-the-code-matrix)

**Zone and attack charts**
- [OBS] DV4 Zone Chart: small multiples, one half-court per setter rotation (`S4`, `S5`, `S6`, labelled by small black tabs). White court, black outline, dashed orange 3 m subdivisions. Each cell contains a compact 2×2 of numbers: total in black, % in blue, break points won in dark red, break points lost in green. Red rounded outlines flag selected or top cells, and a plain text legend sits below in matching colours. There is no heat fill — [DV4 zone analysis](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/blocco2-3_ZoneAnalysis.png)
- [OBS] DV4 Setter calls distribution: white half court with a total (`N 58`) above the net. Blue arrows run from the setter area to the net. Grey shaded wedges cover zones. Pale yellow percent chips carry `19% C`, `36% F`, `28% B`, `12% P`, `5% S`, with the raw count beneath in black — [DV4 distribution image](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/blocco3-2_Distribution.png)
- [OBS] DV4 Consecutive distribution: six columns `S1…S3`, a mini-grid at the top of each with counts and percents, then a list of attacks by set. Each entry has a coloured dot (black `#`, gold `-`, dark red `/`, bright red `=`), a time such as `18:16`, and text such as `3 Spinta in posto 4`. Small triangles show reception quality — [same image](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/blocco3-2_Distribution.png)
- [OBS] DV4 direction entry: grey court on a light panel, white circles for the opposing team, salmon for the attacking team, attack drawn as a thin black jagged path from player to net point, and an action banner (`ATTACK`) under the court — [DV4 direction analysis](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/blocco2-2_DirectionAnalysis.png)
- [DOC] Heat maps in VolleyStation exist only if directions are drawn on the court, can be placed in spreadsheets and combined with arrows or effects — [coding guide](https://volleystation.freshdesk.com/support/solutions/articles/103000267038); [differences article](https://volleystation.freshdesk.com/support/solutions/articles/103000356203-9-main-differences-between-dv-and-vs-pro)
- [DOC] Direction colours are configurable via evaluation groups (winning, losing, intermediate) in DV. In openvolley's heatmap example a diverging `gradient2` fill sits between court background and line layers, with lines drawn on top — [handbook §2.2.5](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf); [openvolley](https://openvolley.r-universe.dev/datavolley/doc/datavolley.html)
- [DOC] Hudl overlays on video: Court Overlay, Speed Overlay, Contact Height, Net Overlay with opacity control, and ball trajectories for serve, reception, set and dig — [Hudl navigate video](https://www.hudl.com/support/hudl-volleyball/guides/navigate-video)

**Football references**
- [OBS] StatsBomb IQ 360 Freeze Frame viewer (2021-22 capture): white UI with a left icon rail, grey accordion headers `PLAYERS` and `FILTERS`, removable grey chips (`× Pass`, `× Carry`) and navy primary buttons (≈#0A1172). Team name in red versus blue with a small score box. Centre: a selectable event list and a key-value table. Pitch: thin grey lines about 1 px, areas outside the camera in mid-grey ≈#707070, visible area white with faint concentric pale rings. Small solid dots ≈8-10 px at 1920 wide, red and blue. Blue halo marks the ball — [StatsBomb post](https://blogarchive.statsbomb.com/news/statsbomb-360-freeze-frame-viewer-a-new-release-in-statsbomb-iq/)
- [OBS] The same viewer has a two-lane event timeline at the bottom: one lane per team, grey vertical ticks for events, a teal band for the selected window and a grey capsule handle. Thin coloured arrows show the sequence on a second pitch with checkerboard zone shading — [StatsBomb post](https://blogarchive.statsbomb.com/news/statsbomb-360-freeze-frame-viewer-a-new-release-in-statsbomb-iq/)
- [DOC] Freeze-frame filters: action type, pitch location, team/player, scenario, pass type, game state, with saved filter sets — [same source](https://blogarchive.statsbomb.com/news/statsbomb-360-freeze-frame-viewer-a-new-release-in-statsbomb-iq/)
- [OBS] Opta Analyst shot map (May 2023 graphic): white page, a full pitch with thin grey lines ≈1 px at this scale and no grass. Each team attacks outward, split at halfway under its club logo. Shots are hollow thin purple rings ≈#5B3FA8, goals are solid red dots ≈#D9534F, and circle size encodes xG. Legend centred at the bottom: `Outcome: Shot / Goal`, `xG value:` with five rings from tiny to large and no numbers. Heavy bold title `Borussia Dortmund 2-2 1. FSV Mainz 05`, grey sub-line with competition and date, and brand logo top right. A stat ladder runs down the centre circle: grey pills (`Goals, xG, Shots, On Target, Possession`) flanked by small red value chips — [image](https://cj-mayes.github.io/Blog-Archive/uploads/2023/06/FxJTTibWwAA-sb1.jpg)
- [DOC] A critic of that graphic praises using red for goals, splitting the pitch by club logos, and using otherwise lost space near the kick-off circle for stats — [CJ Mayes blog](https://cj-mayes.github.io/Blog-Archive/blog/even-more-maps-in-tableau.html)

### Inferences
- [INF] SVG recipe in true metres: `viewBox="-5 -6.5 19 31"` for one full court with free zone, `stroke-width="0.05"`. At 40 px/m: 720 × 360 px, 2 px lines, attack line at 120 px each side of the net. For a small chart at 20 px/m, lines are 1 px. Draw lines inside the outer court rectangle, as FIVB does.
- [INF] Broken attack-line extensions: gap 0.20, dash 0.15, repeated five times from the side line (5 × 0.35 m = 1.75 m). Adding them, and the short service marks, is a cheap detail few generated courts get right.
- [INF] Net: heavier black or dark line than any court line. All real DV courts do this, and it instantly orients a reader.
- [INF] For heat maps use the 3 × 3 grid per half with a count and percent printed in each cell, and fill sequentially with few steps (5 or so). Hide cells with `n` below a threshold instead of colouring them. Real coaches distrust a smooth heat map built on a few events; none of the volleyball tools observed used a blurred KDE.
- [INF] Keep line layers over fills, as in the openvolley example, so zones stay readable.
- [INF] Use small multiples per rotation (S1, S6, S5, S4, S3, S2) as the default chart layout. It is the most distinctive volleyball convention observed.
- [INF] Print `n` on every chart, because DV charts carry a total (`N 58`).
- [INF] For attack charts, the Opta encoding transfers well: hollow ring for a neutral attack, filled dot for a kill, and one size legend. A title strip of match, score, competition and date gives the look of a real analyst graphic.

### Gaps
- No official colour scale, line width or typeface documentation was found for StatsBomb IQ or Opta. The StatsBomb media-pack was not read. Pixel sizes above are estimated.
- No current Hudl/Balltime attack chart or report screenshot was available. Hudl's guides contain no images in the fetched page.
- The position of subzones A-D within a zone was not confirmed from text.

## How do video tools design the player, transport controls, timeline and clip list?

### Takeaway
Analysis video tools are list-driven: filter, build a playlist, step through it from the keyboard. The timeline is usually a set of labelled rows per team and skill, not an NLE track stack. The essential controls are pre-roll and post-roll seconds, frame stepping, and a persistent code-to-video link.

### Cited Findings

**VolleyStation (closest model, images dated about June 2025 by URL stamp [INF])**
- [OBS] Layout: top strip `Close | Season: | Team: | Matches:` with `Save as report` and `Export` (blue fill) on the right. Then a full-width search field and a segmented `Filter by code | Use classic filters`. Below: left list ≈36 % width, right black video pane to the screen edge. The whole page is light apart from the video — [VS Video Analysis image](https://s3-eu-central-1.amazonaws.com/euc-cdn.freshdesk.com/data/helpdesk/attachments/production/103222755578/original/bwz9oOU14zSZRmVuIwAMSJBEBBCLwn7IUw.png?1749729280)
- [OBS] List header: `Matches` title, segmented `Single plays | Full points`, then a tinted row: `Play [2] sec. before [6] sec. after`, `Current 3`, `Selected 69/69 (00:06:54)` — [VS image](https://s3-eu-central-1.amazonaws.com/euc-cdn.freshdesk.com/data/helpdesk/attachments/production/103222755570/original/p-_Q3oiMRjxwt9pq1P5DY_ECKa343D0ZUw.png?1749729279)
- [OBS] Clip row, in a monospace face: blue checkbox, `*16SM-`, `5→6A` with a salmon arrow, `Z3 aZ6`, blue link-coloured `ITA01`, `S1`, `01-00`. At the end, a 3×2 grid of flag tiles (red tile with a tick when set), a film icon and an expand icon. Selected row is pale blue with a thin blue top line — [VS image](https://s3-eu-central-1.amazonaws.com/euc-cdn.freshdesk.com/data/helpdesk/attachments/production/103222755569/original/-2D5Y5ehKjuhHBp3QYuzgk7Z8GjHco0ojA.png?1749729279)
- [DOC] Keys: W/E ±2 s, S/D frame step, F rewind clip, T speed, R deselect, V rally details, Up/Down between plays, 1-6 flags. Clips can be reordered by drag, and a montage can be saved as a report. Each row shows zones, both rotations, opponent and phase, plus a button for the full match coding line — [VS Video analysis](https://volleystation.freshdesk.com/support/solutions/articles/103000356168-video-analysis)

**DataVolley 4**
- [OBS] Dark grey frames ≈#333 and a dark red top toolbar ≈#8B1A1A with white icon-over-label buttons (`Tools, Video, Match, Analysis, Reports, Rallies`) and a red dropdown listing `Montage PRO, Free Search, Statistics Search, Rotations Search, Advanced Search PRO`. Transport under the video on dark grey: thin seek line with white dot, time at left, and white outlined circular icons (camera, pencil, scissors, volume, prev, larger play, next, step, `R`, `FF`, `i`, fullscreen) — [DV4 video-analysis](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/video-analysis.png)
- [OBS] Results list beside the video: raw codes (`*14RM+`, `*12RM-`, `*14RH!`) with blue zone digits and a red arrow (`1→6`), the current row in grey, then a footer with point state, timestamps (`00:08:35 / 00:08:47`), duration (`12"`) and a film button. Below it the editable code form — [same image](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/video-analysis.png)
- [OBS] DV2007's player was a black skin with orange text and icons, including an orange progress bar — so colour-coded codes and a dark player have long co-existed — [handbook screenshot](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] DV4: code entry synced to video, free text and drawing on video, and rally search, with a client streaming video or the last four actions to the bench — [DV4 product page](https://www.dataproject.com/Products/EN/en/Pallavolo/DataVolley4)

**Hudl Volleyball / Balltime**
- [DOC] Context bar at top-left of the video shows the contact's action type, player and score, plus a blue `+ Create Clip`. Search and Filters above the video. Right sidebar icons: Video, Reports, Comments, List, Saved Clips, Review, Grid, Timeline — [Hudl navigate video](https://www.hudl.com/support/hudl-volleyball/guides/navigate-video)
- [DOC] List groups contacts chronologically by rally. Timeline plots contacts horizontally with one row per skill per team: Serve, Serve Receive, Set, Attack, Dig, Block, Cover, Free Ball, Free Ball Receive, Violation. Clicking in any view seeks the video — [same source](https://www.hudl.com/support/hudl-volleyball/guides/navigate-video)
- [DOC] Annotation tools: text, arrow, line, circle, block, freehand, laser pen. Comments pin to timestamp and rally, with audience selection — [same source](https://www.hudl.com/support/hudl-volleyball/guides/navigate-video)
- [OBS] Balltime filter panel, from a marketing composite: dark panel ≈#1F2430, accordion headers, `Rotation` 1-6 and `Set Number` 1-5 as square toggle buttons (selected filled blue-violet ≈#4F6BF5), `Action time` pills `+1 seconds +2 seconds +5 seconds`, `End of rally`, and a full-width `Apply filter`. Top nav text: Reports, Scouting, Exchanges, Team, Playlists, Highlights, Recruiting. Clip list to the right of a dark video — [Hudl Balltime image](https://static.hudl.com/craft/balltime-product-page-highlights-1.webp?v=1752673189)

**Sportscode**
- [DOC] Toolbar: Make Movie, Edit, New Row, New Merged Row, New Timeline, Note, Labels, Matrix, Report, Organizer, Sorter, Database, Find, Settings. Playback modes: merged chronological, row by row, selection order, Append Slow (real speed then 50 %). Overlay text can show row name, instance number and labels — [Timeline Toolbar](https://www.hudl.com/support/manuals/sportscode/code/the-timeline/the-timeline-toolbar)

**Frame.io**
- [DOC] V4 player: controls stay in the same bottom position for video, audio, images and PDFs. Frame-accurate preview shows on timeline hover. Typing a comment pauses playback, and focus returns to the player afterwards so that keyboard control continues — [Frame.io V4 player post](https://blog.frame.io/2024/05/28/frame-io-v4-features-player-and-commenting/)
- [DOC] Comment heads on the timeline show who commented and where. Comments are anchored to a spot in the frame, filterable and individually linkable — [Frame.io Feb 2025 notes](https://blog.frame.io/2025/03/11/whats-new-in-frame-io-version-4-february-2025-releases/); [V4 player post](https://blog.frame.io/2024/05/28/frame-io-v4-features-player-and-commenting/)
- [DOC] Controls that collapse quickly and removing chrome to focus on content are stated goals of the 2018 redesign, not a V4 change. One search summary misdated this to April 2025 — [Frame.io 2018 post](https://blog.frame.io/2018/02/02/a-redesigned-player-experience/)
- [OBS] Frame.io player, image in that post (2018, post updated 2023, so not the current V4 look): near-black ≈#14161F UI, video edge to edge against black, right comments column ≈30 % wide. Top strip holds filename, `v2` version pill, `Approved` status pill, and `Share`. Timeline is one thin blue-violet line under the video with small blue-violet dots at comment positions and a white dot for the active one, plus a floating comment bubble. Below it a wide comment box with timecode chip `00:03` and violet `Send`. Comments carry avatar, name, age, timecode in violet — [Frame.io 2018 post](https://blog.frame.io/2018/02/02/a-redesigned-player-experience/)

**DaVinci Resolve**
- [DOC] Edit page: playhead moves across a fixed timeline; Cut page: playhead fixed while timeline moves — [Blackmagic forum](https://forum.blackmagicdesign.com/viewtopic.php?p=756167)
- [DOC] Sixteen marker colours exist (blue by default) with no built-in meaning; clip colours and flags are separate systems — [Resolve marker guide](https://tryuncle.com/learn/davinci-resolve/davinci-resolve-timeline-marker-color-meaning)
- [OBS] Edit page, Blackmagic hero still (older, the footer reads DaVinci Resolve 16; current version is 21): near-black charcoal ≈#1E1E22 throughout with hairline dividers and small grey text. Three-part layout: media bins and effects list at left, source and timeline viewers side by side at top, inspector at right. Bottom timeline fills the width, with a mixer at far right holding green level meters. Page tabs sit centred along the very bottom edge (Media, Cut, Edit, Fusion, Color, Fairlight, Deliver) — [image](https://images.blackmagicdesign.com/images/products/davinciresolve/edit/hero/hero-still.jpg?_v=1592448885)
- [OBS] Timeline: big white timecode at top left (`01:00:29:01`), track headers `V2 Video 2`, `V1 Video 1`, `A1…A5` with small square toggles. Video clips are thumbnails over a muted steel-blue label strip ≈#4F6F96, audio clips are muted green ≈#3F6B4F with pale waveforms, and a selected clip has a red outline. The playhead is a thin red line with a small red head on the ruler — [same image](https://images.blackmagicdesign.com/images/products/davinciresolve/edit/hero/hero-still.jpg?_v=1592448885)

### Inferences
- [INF] Copy this workspace: left list 30-38 % with code-based rows; black video on the right, with no rounded card; a timeline underneath with skill rows per team as in Hudl; tick marks like StatsBomb's lane, not fat coloured blocks.
- [INF] From Resolve take a thin red playhead, a big timecode at the top left of the timeline, muted desaturated row colours, and hairline dividers. From Frame.io take dots on the seek line for flagged moments. Muted clip colours make the red playhead the one loud element.
- [INF] Essential controls: pre/post-roll seconds as number inputs in the list header; `Selected n/m (mm:ss)` total; `Single plays | Full points`; frame step, ±2 s, speed and next/prev clip on the keyboard.
- [INF] Borrow from Frame.io: typing pauses, focus returns to the player, and the keyboard shortcuts are never stolen. These are invisible but they are what make a tool feel professional.
- [INF] Keep the video pane pure black and let the surrounding UI be light or dark. VolleyStation is light and DV4 is dark, so a light scouting tool is authentic. An all-dark neon look is not required.
- [INF] Flags as a small tile grid (keys 1-6) on each row are a distinctive, copyable pattern.

### Gaps
- The current Frame.io V4 and Resolve 21 interfaces were not seen. The images observed are older, and their colours are estimates. No official palette was found for either.
- No documented playback-speed set or keyboard map for Hudl was found.
- Sportscode's visual appearance (row colours, instance bars) was not seen. Row colour tokens below may relate to this kind of tagging, but this link is my guess.

## What is printed on a classic scoresheet and on DataVolley reports? Could these be a visual reference?

### Takeaway
Yes. Both are extremely strong references: black-on-white ruled forms with fixed columns, small multiples per set and a compact legend. A greyscale DV-style match report is the most recognisable artefact coaches share, and the scoresheet's rotation columns I-VI and slashed 1-48 running score are instantly familiar.

### Cited Findings

**Scoresheet**
- [DOC] Filled in with block capitals in blue or black ink, no pencil — [USAV International Scoring Manual](https://usavolleyball.org/wp-content/uploads/2020/12/International-Scoring-Manual.pdf); [Volleyball Ireland guide](https://www.volleyballireland.com/wp-content/uploads/2020/10/scoresheet_step_by_step.pdf)
- [OBS] Set block: a vertical `SET` label with set number. Left and right team blocks, each with start or end time, `TEAM` name, circle for A/B and circled S/R. Columns `I II III IV V VI` in heavy Roman numerals. Rows for starting number, substitute, score at substitution (`5:12`, `12:22`), then service round boxes with small corner numerals. Far right: a `Points` block of four sub-columns with 12 rows each (1-12, 13-24, 25-36, 37-48, numbers diagonally slashed) and a `Time-Outs` box with scores like `22:21` — [Volleyball Ireland guide, page image](https://www.volleyballireland.com/wp-content/uploads/2020/10/scoresheet_step_by_step.pdf)
- [DOC] Service rounds: boxes numbered 1st-8th beneath columns I-VI, tick the small number when a service starts, and write cumulative points in the box when service is lost. Receiving team gets an X in box 1, column I — [USAV manual](https://usavolleyball.org/wp-content/uploads/2020/12/International-Scoring-Manual.pdf)
- [DOC] Running score: the POINTS column is numbered 1-48 and each point is marked by a diagonal stroke. At set end the unused numbers are cancelled with an "hourglass" drawn from top to bottom — [same source](https://usavolleyball.org/wp-content/uploads/2020/12/International-Scoring-Manual.pdf)
- [DOC] Substitution: entering number below the leaving number, and the score written with the requesting team's score first. Re-entry goes in the lower box, and a number circled means that player cannot return in that set. Each team has two `T` boxes that record the score — [same source](https://usavolleyball.org/wp-content/uploads/2020/12/International-Scoring-Manual.pdf)
- [DOC] Team lists sit bottom-right, with captain circled and C, AC1, AC2 and T officials; RESULTS and APPROVAL boxes close the sheet — [USAV manual](https://usavolleyball.org/wp-content/uploads/2020/12/International-Scoring-Manual.pdf); [Volleyball Ireland](https://www.volleyballireland.com/wp-content/uploads/2020/10/scoresheet_step_by_step.pdf)
- [OBS] The Libero Control Sheet is a three-column ruled table: `Lib. | Rep. | Score` — [USAV manual, Appendix A](https://usavolleyball.org/wp-content/uploads/2020/12/International-Scoring-Manual.pdf)

**DataVolley match report (one A4 page)**
- [OBS] Greyscale, hairline rules, Arial-like type. Top: competition, title "Match report", and a boxed team score. Info box (match no., date, time, city, spectators, hall, referees), then a set table: `Set | Time | Partial score | Score`, with partial scores at about 8, 16, 21 — [handbook, full report image](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] One player table per team. Columns: number, `L/C` marks, name, `Set 1-5` starting-position boxes (grey boxed digit, small empty rectangle for a substitute), `Vote`, Points `Tot BP W-L`, Serve `Tot Err Pts`, Reception `Tot Err Pos% (Exc%)`, Attack `Tot Err Blo Pts Pts%`, `BK Pts`. Italic `Team totals` row, then `Points won: Ser Att Blo Op.Er` by set — [handbook](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] Bottom panels: `Rot / Diff` per setter rotation listed 6 down to 1 with +/-, `Each 1.76 Recept. 1 Point`, `KILL ON RECEPTION`, `1st ATTACK AFTER POSITIVE RECEPTION (+#)`, `...NEGATIVE RECEPTION (-)`, `ATTACK ON DIG`. A boxed legend: BP, Err, Pos, W-L, Pts, Blo, Exc, n = starting line-up position, rectangle = substitute — [handbook](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] The Vote is a weighted average per skill with fixed weights (for example serve: `=` 0, `-` 4, `+` 7, `/` 8, `#` 10, floor 5.5); a minimum of 5-7 % of team actions is required for a vote — [handbook §2.7.3.1](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] Play by play: central axis with score; black words for actions that won a point, red for actions that lost one, green for those won via an opponent error; green setter position numbers at the edges; ball symbol for service possession; stacked rectangles show the lead, with blue for the home team and red for the away team — [handbook §2.7.4](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] DV4's play-by-play keeps this: a white page, centre axis, blue and magenta bars, boxed blue `BP`, green `Time Out`, green rules at each setter change — [DV4 play by play image](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/blocco3-4_pbp.png)
- [DOC] Vendor describes the central graphic as showing scoring flow, with colours showing scoring runs per set — [DV4 product page](https://www.dataproject.com/Products/EN/en/Pallavolo/DataVolley4)

### Inferences
- [INF] Use the report as the visual base for a print or PDF export: exact columns, `.` for empties and a legend box. It costs little and earns immediate credibility.
- [INF] Use Roman numerals I-VI, or the `S1 S6 S5…` order, for rotations. A "Rotation 1-6" card grid reads as generic, whereas `Setter in 1` reads as authentic.
- [INF] A running score column with slashed numbers, or the play-by-play centre axis, is a fresh and authentic timeline element that AI concepts never use.
- [INF] The scoresheet is a look for reports and set summaries, not for the live input surface, since scoresheet layout is designed for pen entry and ruled paper.

### Gaps
- I did not extract the official current FIVB scoresheet PDF. Observations come from the USAV manual and the Volleyball Ireland scan, which use the FIVB form or a close variant. The USAV manual predates the 2025-2028 rulebook.
- Current DV4 printed match report layout was not seen; the 2007 example is assumed to be close, since DV2007 and DV4 screens share table conventions.

## How do coaches' tools balance density and legibility? What do user reviews praise or complain about?

### Takeaway
Pro tools accept very high density and rely on fixed positions, keyboard speed and semantic colour. Praise goes to speed during a match, and to easy navigation. Complaints target AI accuracy, video playback glitches, support and subscription friction. Almost no reviewer asks for prettier visuals. Evidence on this is thin, and a lot of it is store reviews.

### Cited Findings
- [OBS] Typical density: DV tables fit 20+ columns and 8-14 rows inside a ≈800 px window, with one row per player at an estimated 11-12 px type, and hairlines instead of cards — [handbook screenshots](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] DV4 minimum screen spec is 1280×768, Windows only, with USB key licensing — [DV4 product page](https://www.dataproject.com/Products/EN/en/Pallavolo/DataVolley4)
- [DOC] In DV2007 the scouting window's font size is user-adjustable through a button in the window itself; windows can be repositioned, and the scoreboard can flip and collapse — [handbook §1.8.2](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [DOC] Depth is progressive: scouts can log basic codes live and add zones and combos later with the video open; DV4 can be set to few or all skills — [handbook §1.10.5](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf); [DV4 page](https://www.dataproject.com/Products/EN/en/Pallavolo/DataVolley4)
- [DOC] A 2015 reader comment on a coaching blog describes Click&Scout as a simpler touch-based DataVolley with less detail, which still needs someone to record the match. This is one person's view — [Coaching Volleyball](https://coachingvb.com/old-school-analysis/)
- [DOC] DV4's learning curve is implied by the existence of a third-party paid "Unofficial DV4 Manual" and of training podcasts. I found no direct complaint text — [Smarter Volley](https://smartervolley.substack.com/p/the-unofficial-dv4-manual)
- [DOC] SoloStats Live (4.8 stars, 67 ratings): praised for efficiency and for being easier on a phone in landscape with thumbs than the previous iPad version — [App Store](https://apps.apple.com/us/app/solostats-live/id1132326165)
- [DOC] SoloStats 123: mixed. Some reviewers praise use during matches and support; others call it poor or ask for a missing setter-attempt button. A third-party NLP estimate of negative sentiment is unreliable — [JustUseApp](https://justuseapp.com/en/app/499803638/solostats-123-volleyball/reviews)
- [DOC] Balltime AI app (3.1 stars, 29 ratings): praised for easy navigation, quick highlights and one reviewer's preference over Hudl. Complaints: fullscreen stuck on one play in a series, AI misidentifying players, watermark and subscription friction, slow support — [App Store](https://apps.apple.com/us/app/balltime-ai/id6450258692)
- [DOC] Click&Scout has 3.0 stars from only 4 ratings, so it is not meaningful — [App Store](https://apps.apple.com/us/app/click-scout-eng/id577453400)
- [OBS] Dated-look warning: Click&Scout's glossy 3D chips and SoloStats's bright purple and pink headers show the risk of untuned colour; DV2007's maroon desktop is a period habit. DV4 has moved to flat, greyer chrome — [Click&Scout](https://apps.apple.com/us/app/click-scout-eng/id577453400); [SoloStats](https://apps.apple.com/us/app/solostats-live/id1132326165); [DV4](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/blocco1-1_Finestra%20rilevazione.png)

### Inferences
- [INF] Principles to copy: fixed positions over adaptive layout, tabular numbers, one row per player, empty values quieter than values, colour for team and outcome only. Density is acceptable as long as the entry path is fast.
- [INF] Two density modes: live scouting needs large score, large input and large target buttons; post-match analysis can be DV-dense.
- [INF] Trust cues outrank polish. Always-available undo, a visible code for every action, a verifiable rotation, and a way to correct AI suggestions address the complaints above.
- [INF] What would look like an AI concept: gradient KPI cards, big rounded panels, neon on black, glassmorphism, sparkline on everything, a 3D or perspective court, invented scores such as "Performance 87". None of these appears in the real working screens I observed, apart from Hudl's marketing composites.

### Gaps
- No credible forum or review dataset was found on DV4 or VolleyStation UI. Search found only academic surveys and coaching blogs, so complaints about DV's interface are my inference, not evidence.
- No Hudl coach-level UI reviews were read (G2, Capterra and Reddit were not sampled).

## Exact brand colours, fonts and component habits

### Takeaway
Exact tokens were obtained for Hudl (Uniform) and fonts for VolleyStation, DataProject and Opta Analyst. Others are estimates from screenshots. No vendor publishes a chart palette publicly, as far as I found.

### Cited Findings

**Hudl Uniform (exact [CSS], © 2016-2020, may be legacy)** — source for all: [uniform.hudl.com](https://uniform.hudl.com/guidelines/colors/design/)
- Brand: orange `#ff6300`, electric `#009ce3`, ink `#232a31`, evening `#38434f`, slate `#4e5d6c`.
- Dark surfaces: level0 `#101417`, level1 `#191f24`, level2 `#232a31`, level3 `#353f4a`; accents level1 `#2c343e`, level2 `#313b45`.
- Light surfaces: level0 `#ffffff`, level1 `#f9fafb`, level2 `#f2f5f7`, level3 `#ebeff2`.
- Dark text: contrast `#e6f2ff`, default `#c3cedb`, subtle `#9daab8`, nonessential `rgba(230,242,255,.4)`; divider `rgba(122,138,153,.6)`.
- Light text: contrast `#13293f`, default `#3a4d5f`, subtle `#506277`; divider `rgba(167,174,181,.6)`.
- Selection: outline and edge `#009ce3`, background light `#e6f7ff`, dark `#003852`. Focus `#33afdf`.
- Utility: action `#009ce3`, confirmation `#78a100`, warning `#f2b600`, critical `#e81c00`, information `#4d6680`. Buttons: primary `#027dbb`, confirm `#538306`, destroy `#e81c00`.
- **Tagging palette**, with shade for a border: white `#fcfbfc/#c5c5c5`, grey `#727476/#595a5c`, black `#3c3c3c/#292929`, yellow `#ffdd00/#e3c000`, orange `#ff9000/#db7b00`, red `#c91a1a/#a01414`, green `#55a734/#3b831d`, blue `#2d83c9/#2468a0`, purple `#621296/#480b6f`, pink `#ff4ca2/#de3c8a`.
- Type and spacing: Helvetica/Arial stack; sizes 0.75, 0.875, 1, 1.125 rem; radius 0.125 and 0.25 rem only; spacing 0.125, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4 rem.
- Design statement: Uniform describes its colour use as subtle by default, so that loud moments count — [Uniform colours](https://uniform.hudl.com/guidelines/colors/design/)
- Hudl's current marketing font is Barlow, with body colour `#232a31` — [CSS on hudl.com StatsBomb page](https://www.hudl.com/en_gb/products/statsbomb)

**Others**
- [CSS] VolleyStation: site in Roboto, text `rgb(39,62,86)` = `#273e56`; blog in Manrope — [volleystation.com](https://volleystation.com/); [blog](https://blog.volleystation.com/new-rotation-and-player-filtering/)
- [OBS] VolleyStation app: pale blue-grey header tints, accent blue ≈#5B9BF0, a monospace for codes, and a Roboto-like UI font — [VS images](https://volleystation.freshdesk.com/support/solutions/articles/103000356168-video-analysis)
- [CSS] DataProject website: Lato, body `rgb(70,70,70)`. Handbook typography: Trebuchet MS, Arial and Calibri — [dataproject.com](https://www.dataproject.com/Products/EN/en/Pallavolo/DataVolley4); [handbook PDF metadata](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf)
- [OBS] DataVolley identity: strong red and black, dark red toolbar, and salmon side panel in 2007 — [handbook](https://bli.is/wp-content/uploads/2019/09/dvwin2007_handbook.pdf); [DV4 image](https://dataprojectweb.blob.core.windows.net/productdetailsimage/DVW4/ENG/video-analysis.png)
- [CSS] Opta Analyst: headings Big Shoulders Text (condensed), body Lora, background `#f7f7f7`, 6 px radius, type scale 12/14/16/18/21/24/30/36/42/60 px. [OBS] Deep purple header and magenta logo marks — [theanalyst.com](https://theanalyst.com/)
- [OBS] StatsBomb: black-and-red wordmark; IQ uses navy buttons on white, and grey chips — [StatsBomb post](https://blogarchive.statsbomb.com/news/statsbomb-360-freeze-frame-viewer-a-new-release-in-statsbomb-iq/)

### Inferences
- [INF] A palette that sits inside the tradition: home blue or navy, away red, libero yellow chip, setter inverted circle, code text in monospace, 2-4 px radii, 1 px dividers, and one accent. Team colours should be configurable, because DV and Click&Scout both tie them to the shirt.
- [INF] Suggested semantic mapping for outcome: point won black or dark green, continue neutral grey or green, point lost red. Click&Scout and DV's play-by-play both use black for scored and red for lost, so a green "good" is not the volleyball default. Test for colour blindness, since red and green often co-occur in these tools.
- [INF] Suggested type: Barlow or Roboto for UI, with tabular figures; a monospace (JetBrains Mono, IBM Plex Mono or Roboto Mono) for codes; a sans at 12-13 px in tables.

### Gaps
- No exact palette for DataVolley, VolleyStation app, StatsBomb IQ or Opta charts. Values marked ≈ should be re-sampled from the images linked if exact matching is needed.
- Frame.io and Resolve exact palettes were not obtained; only by-eye estimates are given above.
- Uniform's Version 3 pages may be superseded, and I could not confirm what Hudl's video app uses today.

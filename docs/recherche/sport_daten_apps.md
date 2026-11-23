# Visual design conventions of successful sports score and statistics products

Status: 4 Nov 2026. Evidence labels used throughout:
- **[M]** measured on the live page (computed CSS, element size, or CSS custom property read in the browser)
- **[V]** seen in a screenshot of the live page, not measured
- **[R]** reported by a third-party or official source
- **Inferences** sections hold my own conclusions

Measurement context: pages were rendered at about 1024 CSS px wide, so some sites may use tablet or small-desktop breakpoints. Dark colour preference was active, so Sofascore, FotMob and Flashscore rendered dark. Light tokens are given where they could be read. Apple Sports has no measurable web version.

## How do they lay out a match row, a league table, a match header and a player page, and how dense are they?

### Takeaway
Everything converges on rows of 32-48px, 12-14px text and 16-24px crests. Volleyball-specific rows put sets won in bold, followed by small grey per-set points in fixed columns. Headers stay modest (Sofascore 18-28px, FotMob 30px, Flashscore 46px for the score), and player pages are lists of facts rather than dashboards.

### Cited Findings

**Density at a glance [M]**

| Product | Match row | League table row | Table text | Crest in table | Largest score numeral |
|---|---|---|---|---|---|
| Sofascore | 48px, two lines | 32px | 12px | 24px | 18px in header, 28px in side panel |
| FotMob | 64px, one line | 36px | 14px | 17px | 30px |
| Flashscore | 47px + 1px line, two lines | 36px | 13px | not measured | 46px |
| ESPN | 39px per team line | 36px (30px small variant) | 12px | not measured | not captured (stat values 20px) |
| VolleyballWorld | 147px card | 46px on match box score; about 55px on standings [V] | 14-16px | flag about 28px wide [V] | not measured |
| VBL site | card/list ticker | about 62-64px | 16px | none | not measured |

**Sofascore**
- **Match row [M]:** 48px anchor with 2px radius, showing a time column (12px, white at 50%), then 16px crest + team name (14/400) on two stacked lines. Set totals sit at the right, then a favourite star button. Source: [Sofascore volleyball](https://www.sofascore.com/volleyball)
- **League group header [M]:** 48px tall. League name is 12/700, country with small flag sits below it, plus a match count pill and a collapse chevron. Source: [Sofascore volleyball](https://www.sofascore.com/volleyball)
- **Volleyball table [M]:** 32px rows. Columns are P, W, L, DIFF, S (`15:0`), SR, Last 5, PTS. Fixed cell widths are 32/42/54px, centred. Rank is 12/700 and team name 12/400. Column heads are 12/500 at 50%. "Playoffs" and "Relegation" appear as small grey section labels. A "Rules and legend" accordion closes the table. Source: [Sofascore 1st Bundesliga](https://www.sofascore.com/volleyball/tournament/germany/1st-bundesliga/501)
- **Volleyball match header [M]:** 48px crests, team name only 12/700, set scores 14/700 in columns 26px apart, set totals 18/700. The side panel has a 28/700 total. Below sit a point-by-point log per set (`3rd set 28 - 30`) and a momentum graph. Source: [Netzhoppers vs Powervolleys](https://www.sofascore.com/volleyball/match/netzhoppers-kw-bestensee-powervolleys-duren/dzjsEzj)
- **Player page [M/V]:** 110px round photo, name, follower count, player ID, club crest + contract date. A one-line meta row with tiny icons follows (flag, birth date, position, height, foot, number). Previous and next match sit in two mini cards. Lower down are monthly rating bars, an attribute radar (ATT, TEC, TAC, DEF, CRE), a position pitch, strengths/weaknesses lists and transfer history. Source: [Sofascore player](https://www.sofascore.com/football/player/harry-kane/108579)

**FotMob**
- **Match row [M]:** 64px single line with home right-aligned, 22px crest, centre score/time, 22px crest, away left-aligned, audio and TV icons at far right. 14/400 text. League header 48px at 14/500. Source: [FotMob](https://www.fotmob.com/)
- **Table [M]:** 36px rows, 14/400, position and PTS 14/500, 17px crest. Columns are #, PL, W, D, L, +/-, GD, PTS, Form, Next [V]. Filter chips above read All, Home, Away, Last 5 matches, xG, Fixture difficulty. Source: [FotMob Bundesliga table](https://www.fotmob.com/leagues/54/table/bundesliga)
- **Match header [M/V]:** back link, competition + round, Follow button, a date/venue line, then team names flanking a 30/500 `0 - 2`, "Full time" and scorers with minutes. Tabs follow. Source: [FotMob match](https://www.fotmob.com/matches/bayern-munchen-vs-atletico-madrid/37vqh7#6106266)
- **Player page [M/V]:** a flat band in team colour with an 80px cut-out photo, 28/500 name, club and Follow. Below is a two-column bio grid (value 16/400 over a dim label) divided by hairlines, a small pitch with a position pill, a market value line chart, season stats, and 40px match rows. Source: [FotMob player](https://www.fotmob.com/players/194165/harry-kane)

**Flashscore**
- **Volleyball result row [M]:** this is the closest template for our use. 47px + 1px line. Star, then date `03.11. 20:00` (13/400) on the left, then 16px crest + name stacked. Winner name is 13/700, loser 13/400. Sets won are 13/700 in 20px columns. Per-set points are 13/400 `#999` in 34px columns. Source: [Flashscore results](https://www.flashscore.com/volleyball/germany/1-bundesliga/results/)
- **League group header [M]:** only 33px tall, reading "GERMANY: 1. Bundesliga" with a flag, pin and a "Standings" link [V]. Source: [Flashscore results](https://www.flashscore.com/volleyball/germany/1-bundesliga/results/)
- **Match header [M]:** 58px crest on a white tile with 12px radius, names 16/800, score 46/400 with date above and uppercase status below. Below that are uppercase tabs and a score table with 36×32px set cells. Source: [Flashscore match](https://www.flashscore.com/match/volleyball/karlsruhe-Gt32HqU2/rottenburg-xUFixoUG/?mid=dQX36GfU)

**ESPN**
- **Standings [M/V]:** 12px Benton Sans, 11/500 uppercase column heads, 13 stat columns including home/away splits, DIFF, STRK and L10. Source: [ESPN standings](https://www.espn.com/nba/standings)
- **Scoreboard [M/V]:** 32px logos, record under each name ("7-1, 3-0 Away"), venue and action buttons in a right column. Source: [ESPN scoreboard](https://www.espn.com/nba/scoreboard)
- **Player page [M/V]:** 161px header with photo over a team-coloured slanted panel. First name is light and last name heavy, uppercase at 32/700. A key-value bio list comes next, then a four-number stat block (values 20/700, labels 11px, league rank beneath each). Source: [ESPN player](https://www.espn.com/nba/player/_/id/4065648/jayson-tatum)

**Apple Sports (from Apple's current iOS 26 App Store screenshots) [V]**
- **Row:** crest with short name beneath on each side, large condensed score, centre clock, tiny grey league label and play detail. There are no borders on rows, only group spacing. Source: [App Store listing](https://apps.apple.com/us/app/apple-sports/id6446788829)
- **Game sheet:** large condensed numerals, a period-by-period box score, and team stats as mirrored bars with numbers at the ends. Source: [App Store listing](https://apps.apple.com/us/app/apple-sports/id6446788829)
- **Grids [R]:** odds and standings columns stay aligned at larger Dynamic Type sizes, with team names truncated and headers wrapping. Source: [Lickability](https://lickability.com/blog/apple-sports/)
- **Character [R]:** John Gruber likened the design language to Apple Weather and called it simple and focused. Source: [Daring Fireball](https://daringfireball.net/2024/02/apple_sports)

**VolleyballWorld**
- **Match card [M/V]:** 147px white card, black "MEN" tag, round + venue on the left, flag + country in two rows, set total, then per-set points. A lime WATCH button sits at right. Source: [VNL schedule](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/schedule/)
- **Box score [M/V]:** 46px rows. Shirt number 16/400 in coral, bold name, position code (OH, MB), then Total ABS, Attack/Block/Serve Points, Errors, Efficiency %. Tabs: Scoring, Attack, Block, Serve, Reception, Dig, Set. An "All sets" selector and a two-team flag switcher sit above. Source: [Japan vs Slovenia](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/schedule/26548/?match=japan-vs-slovenia)
- **Standings [V]:** about 55px rows and only rank, flag, team, Won, Points, Set Ratio, Point Ratio on the Basic view, with an Advanced toggle. Source: [VNL standings](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/standings/men/)

**VBL (German league)**
- **Table [M/V]:** about 62-64px rows, 16px text, centred bold team names, no crests, columns Team, Matches, Wins, Sets, Points. Source: [VBL Tabelle](https://www.volleyball-bundesliga.de/cms/home/1_bundesliga_maenner/statistik/tabelle/tabelle_hauptrunde.xhtml)
- **Live ticker [V]:** date tabs (Gestern, Heute, Morgen), a tile/list switch (Kachelansicht, Listenansicht), and result entries with set points and a Spielbericht link. Source: [VBL ticker](https://www.vbl-ticker.de/)
- **Spielbericht PDF [V]:** a very dense A4 page from Data Volley 4. Header block with a set table (Satz, Dauer, Zwischenstände, Endstand). Per-player columns are Note; Punkte (Ges., BP, G-V); Aufschlag (Ges., Fhl, Pkt); Annahme (Ges., Fhl, Pos%, Prf%); Angriff (Ges., Fhl, Blo, Pkt, Pkt%); Bk Pkt. Below are per-set subtotals, a rotation table, side-out and breakpoint counts, and attack after good versus poor reception. Source: [VBL match report 1181](https://live.volleyball-bundesliga.de/2025-26/Men/1181.pdf)

### Inferences
- A German volleyball row can copy Flashscore almost directly: date/time, crest + name stacked, bold sets won, grey per-set points in fixed columns.
- 32-36px is the proven table row height. VBL (about 62px) and VolleyballWorld (about 55px) are the loosest tables in this set and show less data per screen.
- The VBL Spielbericht vocabulary (Annahme Pos%/Prf%, Angriff Pkt%, BP, G-V) is the language German coaches already read, so it is a stronger basis for labels than translated English terms.

### Gaps
- Live match-row states (live indicator on a running set, current-point display) could not be measured because few matches were live at capture. Only Sofascore's Live filter chip was measured.
- `live.volleyball-bundesliga.de` returned 403 at its root, so only individual PDFs were accessible.
- No VBL or VolleyballWorld player profile page was inspected, and Sofascore's player page was measured on football, not volleyball.
- Mobile layouts of the websites were not measured.

## What are their exact colours and fonts?

### Takeaway
Each product has one saturated brand accent on a near-neutral base, plus a small set of functional colours. Every website measured uses a custom or licensed typeface for at least its data or headings, rather than relying only on a default UI font.

### Cited Findings

**Sofascore [M]** (tokens from [Sofascore volleyball](https://www.sofascore.com/volleyball))
- **Brand:** primary `#374DF5`, variant `#2C3EC4`, secondary `#0BB32A`.
- **Surfaces, light:** page `#EDF1F6`, card `#FFFFFF`.
- **Surfaces, dark:** page `#000000`, card `#171C1F`, raised `#272C32`.
- **Text, light:** `#222226` at 100/70/45/15/6%.
- **Text, dark:** `#ECEDEF`, then white at 75/50/15/8%.
- **Live:** `#CB1818` light, `#E73B3B` dark. Chip background is the same red at 10% light and 20% dark.
- **Home/away data colours:** home `#0BB32A`, away `#374DF5`.
- **Standings:** promotion `#26943B`, promotion playoff `#49CB40`, relegation `#C1262D`, relegation playoff `#FEA500`. Rendered dark-mode playoff stripe was `#3BB552`.
- **Dark loss chip:** `#E35C47` rendered (token `status.error.default`, light `#C7361F`). Light success token is `#15B168`. Source: [Sofascore 1st Bundesliga](https://www.sofascore.com/volleyball/tournament/germany/1st-bundesliga/501)
- **Rating scale:** no rating `#A4A9B3`; 3.0-5.9 `#DC0C00`; 6.0-6.4 `#ED7E07`; 6.5-6.9 `#D9AF00`; 7.0-7.9 `#00C424`; 8.0-8.9 `#00ADC4`; 9.0-10 `#374DF5`. Source: [Sofascore rating guidelines](https://www.sofascore.com/rating-guidelines)
- **Font [M/R]:** body stack begins with "Sofascore Sans", and a Condensed token exists. Hot Type built the family in 2023 with a monospace sibling, flattened curves in numerals, and vertical metrics matched to the earlier Roboto. Source: [It's Nice That (sponsored content)](https://www.itsnicethat.com/articles/hot-type-sofascore-graphic-design-sponsored-content-200923)

**FotMob [M]** (tokens from [FotMob](https://www.fotmob.com/))
- **Dark surfaces:** page `#000`, card `#1D1D1D`, group header `#262626`, chip/border `#333`, raised `#383838`/`#464646`.
- **Dark text:** `#FFF`, `#CCC`, `#9F9F9F`.
- **Accents:** live green `#61DF6E`, success `#33C771`, orange `#FF963F`, red `#FF3939`, blue `#14A0FF`.
- **Result tokens:** win `#33C771`, lose `#FF3939`, draw `#8D9499`. Lose and draw have 15% tints (`#FF393926`, `#8D949926`).
- **Form chips use darker values:** win `#00985F`, draw `#8D9499`, lose `#DD3636`. Source: [FotMob table](https://www.fotmob.com/leagues/54/table/bundesliga)
- **Font:** `walsheim` at a 14px base. Source: [FotMob](https://www.fotmob.com/)

**Flashscore [M]** (from [Flashscore standings](https://www.flashscore.com/volleyball/germany/1-bundesliga/standings/))
- **Brand and dark surfaces:** primary `#FF0046` (token from the light-theme rule), page `#010A0F`, panel/header `#001E28`, row line `#0F2D37`.
- **Dark text:** `#EEEEEE`, `#D9D9D9`, `#C8CDCD`, `#999999`.
- **Form:** win `#00A83F`, unknown `#555E61`.
- **Light-theme tokens:** green `#14DC4B`, red `#DC0000`, yellow `#FFCD00`, live row `#FFE6F3`, favourite `#FFF2CE`, highlight `#EEF7FF`.
- **Font:** `LivesportFinderLatin` with a 13px base.

**ESPN [M]** (from [ESPN standings](https://www.espn.com/nba/standings))
- **Colours:** page `#EDEEF0`, card `#FFFFFF`, body text `#2B2C2D`, table text `#444`, column line `#CCC`. Secondary text on the scoreboard is `#6C6D6F` and `#48494A`.
- **Fonts:** "Benton Sans" for tables and "ESPN Ignite Text Narrow" for headlines and stat values, with a system stack for other UI. Source: [ESPN player](https://www.espn.com/nba/player/_/id/4065648/jayson-tatum)

**Apple Sports [R/V]**
- **Type:** system font with variable width and weight axes for bold, compact scores. Source: [Lickability](https://lickability.com/blog/apple-sports/)
- **Colour:** a league or team tint fades into dark, and secondary labels use vibrancy so the tint shows through. Source: [Lickability](https://lickability.com/blog/apple-sports/)

**VolleyballWorld [M]**
- Page `#F4F4F4`, text `#151515`/`#282828`, coral accent `#FF5744`, zebra `#FFFFFF`/`#F8F8F8`. Lime CTA and a purple-to-blue gradient VNL sub-navigation were seen but not measured [V]. Font: `Biotif`. Source: [VNL standings](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/standings/men/)

**VBL [M]**
- Navy `#1B365D`, body grey `#545454`, zebra `rgba(198,205,214,.3)`, orange and blue gradient buttons [V]. Fonts: `SizmoPro` and `SizmoProBoldOblique` for 32px italic headings. Source: [VBL Tabelle](https://www.volleyball-bundesliga.de/cms/home/1_bundesliga_maenner/statistik/tabelle/tabelle_hauptrunde.xhtml)
- The ticker uses `FFSizmoWebProRegular` at 14px on `#1A365D` text. Source: [VBL ticker](https://www.vbl-ticker.de/)

### Inferences
- Tinted near-blacks (`#171C1F`, `#001E28`) or plain neutral greys (`#1D1D1D`) are both accepted, so neither needs to be avoided. What matters is the consistency of the layers: page, card, line.
- Sofascore and FotMob both run a separate, saturated data palette next to a restrained UI palette. Copying that split is safer than tinting everything with one brand hue.
- VBL's Sizmo oblique and navy are already associated with German volleyball, though adopting them could read as imitating the league's branding.

### Gaps
- ESPN red and VolleyballWorld lime were not measured.
- FotMob light-theme values and Sofascore's dark win colour were not captured.
- Font licensing and availability were not researched.
- I found no team-authored FotMob or Flashscore design case study, and no public Mobbin data could be read.

## How do they show form, score, sets and ratings, and what replaces big numeral tiles?

### Takeaway
They use small, repeated, in-row marks: letter chips, coloured rating pills, bold versus dim scores and thin stripes. A value's meaning comes from its position in a column and its colour, not from its size.

### Cited Findings

**Form**
- **Sofascore [M/V]:** W/L letters 14/700 on a fused bar of 23×16px cells with no gaps and no radius, dark text on colour. Empty slots stay as dark blocks when fewer than five matches exist, so column width never changes. Source: [Sofascore 1st Bundesliga](https://www.sofascore.com/volleyball/tournament/germany/1st-bundesliga/501)
- **FotMob [M]:** 24×24px chips, 5px radius, 12/500 white letter. The latest match gets a 16px wide, 2px underline, 4px below the chip, in the chip's colour. Chips are links. Source: [FotMob table](https://www.fotmob.com/leagues/54/table/bundesliga)
- **Flashscore [M/V]:** 20×20px chips, 4px radius. A grey `?` chip leads the row for the next match. Source: [Flashscore standings](https://www.flashscore.com/volleyball/germany/1-bundesliga/standings/)
- **ESPN [V]:** no chips. Plain text columns `W4` (STRK) and `7-1` (L10), with DIFF in green or red text. Source: [ESPN standings](https://www.espn.com/nba/standings)

**Score and sets**
- **Sofascore [M]:** the losing side's whole column is white at 50%, and the winner is at full strength. Source: [Netzhoppers vs Powervolleys](https://www.sofascore.com/volleyball/match/netzhoppers-kw-bestensee-powervolleys-duren/dzjsEzj)
- **Flashscore [M]:** bold is reserved for the winner's name and sets won, and all set points stay `#999`. Source: [Flashscore results](https://www.flashscore.com/volleyball/germany/1-bundesliga/results/)
- **VolleyballWorld [V]:** in each set, the winning side's points are bold and dark and the loser's are light grey, so a reader can scan who took each set. The losing nation is also greyed. Source: [VNL schedule](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/schedule/)
- **VolleyballWorld header [V]:** this is the one place with small score tiles, dark squares of about 32px holding 1 and 3. Source: [Japan vs Slovenia](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/schedule/26548/?match=japan-vs-slovenia)
- **VBL ticker [M]:** each set is listed with a small set number between the two sides' points in the page text (25, (1), 22). Source: [VBL ticker](https://www.vbl-ticker.de/)

**Ratings**
- **Sofascore format [R]:** match ratings use one decimal and averages two. Source: [Sofascore rating guidelines](https://www.sofascore.com/rating-guidelines)
- **Sofascore shapes [R]:** single-match ratings are a solid box and averages get corner brackets. This comes from a search summary of the [Sofascore ratings article](https://www.sofascore.com/news/?p=69315), which I did not open.
- **Sofascore in charts [M]:** monthly bars label ratings at 12/700 in the band colour as coloured text, not a box. Source: [Sofascore player](https://www.sofascore.com/football/player/harry-kane/108579)
- **FotMob pills [M]:** match pill 28×22px, 6px radius, 12/500 black on `#33C771`. Season pill 40×22px at 16/500 (`7.96`). Lineup pill 32×18px, 12px radius, orange `#FF963F` or green. Source: [FotMob player](https://www.fotmob.com/players/194165/harry-kane); [FotMob match](https://www.fotmob.com/matches/bayern-munchen-vs-atletico-madrid/37vqh7#6106266)
- **VBL Spielbericht [V]:** a plain "Note" column shows values like 5.5 and 7.3 with no colour at all. Source: [VBL match report 1181](https://live.volleyball-bundesliga.de/2025-26/Men/1181.pdf)

**Other substitutes for tiles**
- **Table position:** Sofascore and FotMob use a 2px stripe at the row's left edge (FotMob 2×28px, `#2AD572`; Sofascore full row height, `#3BB552`). Flashscore colours the rank number's small square instead and explains it with a legend. Sources: [Sofascore 1st Bundesliga](https://www.sofascore.com/volleyball/tournament/germany/1st-bundesliga/501); [FotMob table](https://www.fotmob.com/leagues/54/table/bundesliga); [Flashscore standings](https://www.flashscore.com/volleyball/germany/1-bundesliga/standings/)
- **Comparison stats:** FotMob puts a white pill behind the better value of a stat pair [V]. Source: [FotMob match](https://www.fotmob.com/matches/bayern-munchen-vs-atletico-madrid/37vqh7#6106266)
- **Mirrored bars:** Apple Sports uses them for team stats, with numbers at both ends [V]. Source: [App Store listing](https://apps.apple.com/us/app/apple-sports/id6446788829)
- **Value plus rank:** ESPN puts a league rank under each stat (`8th`, `Tied-62nd`), so the number has context [V]. Source: [ESPN player](https://www.espn.com/nba/player/_/id/4065648/jayson-tatum)

### Inferences
- A number's meaning should come from comparison (rank, opponent, league context) rather than from size. ESPN's rank line and FotMob's better-value pill are the most directly transferable.
- A volleyball-specific form mark could add set detail (for example `3:1` instead of only W), since none of these products shows it in the form column. This is an idea, not an observed convention.
- Showing all per-set points bold for the set winner, as VolleyballWorld does, suits volleyball better than Flashscore's uniform grey because sets are separate contests.

### Gaps
- FotMob's rating thresholds are not documented on the pages I read. Observed: 7.2-9.3 green, orange on some lineup pills (values not read), blue on two 9.1 ratings while 9.2 and 9.3 stayed green. Blue may mark player of the match, but this is unverified.
- Sofascore volleyball matches showed no player ratings in the parts of the page I read, so I could not confirm whether they exist for volleyball.

## What are the habits for corners, borders, shadows, spacing and content separation?

### Takeaway
Large outer cards (10-16px radius) with no shadow hold flat, square interiors. Separation comes from a single hairline or a 4% zebra, and the small marks inside have tiny radii (0-6px). VolleyballWorld and VBL, the two least dense products, are the ones using visible shadows or gradients.

### Cited Findings

| Product | Card radius | Inner marks | Card shadow | Row separation |
|---|---|---|---|---|
| Sofascore [M] | 16px | row hover 2px, form 0px, odds box 8px, chips 24px | none measured | group spacing and thin lines between groups [V] |
| FotMob [M] | 16px | form 5px, rating 6px, hover row 8px, chips 22px | none, 1px transparent border | 1px `#262626` under each match row |
| Flashscore [M] | not measured | form 4px, crest tile 12px | not captured | 1px `#0F2D37` (results), 1px `rgba(200,205,205,.25)` (standings) |
| ESPN [M] | 10px | not measured | none measured | zebra `rgba(0,0,0,.04)`, header line 1px `#CCC` |
| VolleyballWorld [M] | 0px match card, 8px buttons/tabs | n/a | `0 3px 4px rgba(0,0,0,.15)`; button `1px 1px 3px rgb(138,138,138)` | zebra `#FFF`/`#F8F8F8`, 1px coral header line, vertical hairlines [V] |
| VBL [M/V] | no card radius noted | gradient buttons with shadow | light shadow on table container [V] | zebra `rgba(198,205,214,.3)` |

Sources: [Sofascore](https://www.sofascore.com/volleyball); [FotMob](https://www.fotmob.com/); [Flashscore](https://www.flashscore.com/volleyball/germany/1-bundesliga/results/); [ESPN](https://www.espn.com/nba/standings); [VNL standings](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/standings/men/); [VNL schedule](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/schedule/); [VBL Tabelle](https://www.volleyball-bundesliga.de/cms/home/1_bundesliga_maenner/statistik/tabelle/tabelle_hauptrunde.xhtml)

- **Sofascore scales [M]:** spacing tokens are 2, 4, 8, 12, 16, 24, 32, 40, 48px. Radius tokens are 2, 4, 8, 12, 16, 24px and 50%. Elevation tokens exist at `rgba(34,34,38,.16)`. Source: [Sofascore volleyball](https://www.sofascore.com/volleyball)
- **Filter chips [M]:** FotMob's are 32px tall with 22px radius, active white and inactive `#333`. Source: [FotMob table](https://www.fotmob.com/leagues/54/table/bundesliga)
- **Active tab [V]:** a short coloured underline is the shared idiom. It is green on FotMob, red on Flashscore and ESPN, and coral on VolleyballWorld. Sources: [FotMob table](https://www.fotmob.com/leagues/54/table/bundesliga); [Flashscore match](https://www.flashscore.com/match/volleyball/karlsruhe-Gt32HqU2/rottenburg-xUFixoUG/?mid=dQX36GfU); [ESPN scoreboard](https://www.espn.com/nba/scoreboard); [VNL standings](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/standings/men/)
- **Bands [V]:** Flashscore and ESPN place small grey or dark bands above a section (29px head on `#001E28` for Flashscore). VolleyballWorld uses a heavy black date band ("2 AUGUST"). Sources: [Flashscore standings](https://www.flashscore.com/volleyball/germany/1-bundesliga/standings/); [VNL schedule](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/schedule/)

### Inferences
- A good default from these values is one outer card radius (12-16px), inner marks at 0-6px, no shadow, and only one separator per list (either hairline or zebra, not both).
- Uniformly medium radii on everything (cards, chips, tiles all at the same 8-12px) do not appear in these products. Mixing a large outer radius with sharp inner marks is part of their look.
- Sofascore's spacing scale is ordinary (4/8-based), so the difference in feel comes from tighter use of the small end of the scale.

### Gaps
- Actual gaps between cards were only partly captured (Sofascore uses `gap_sm`/`md:gap_md` classes, 8/12px per its token scale).
- Flashscore's panel radius and shadow were not captured, though panels looked lightly rounded [V].

## What gives each its recognisable character, including imperfections, crests, numbers, flags and country groupings?

### Takeaway
Character comes from real data objects and tolerated oddities: crests of uneven quality, flags, abbreviated names, jersey numbers, odd values like `∞`, SEO text and ad clutter. Very little of it comes from decoration.

### Cited Findings
- **Sofascore identity [M/R]:** a custom numeral-focused typeface and an electric blue accent. Source: [It's Nice That](https://www.itsnicethat.com/articles/hot-type-sofascore-graphic-design-sponsored-content-200923)
- **Sofascore quirks [M/V]:**
  - Set ratio shows `∞` and `1200.00` in a tidy table. Source: [Sofascore 1st Bundesliga](https://www.sofascore.com/volleyball/tournament/germany/1st-bundesliga/501)
  - The page's H1 is a 12/500 grey SEO sentence inside the breadcrumb. Source: [Sofascore player](https://www.sofascore.com/football/player/harry-kane/108579)
  - The public "Sofascore Player ID", "Who will win?" fan vote and odds all sit right by the match. Sources: [Sofascore player](https://www.sofascore.com/football/player/harry-kane/108579); [Netzhoppers vs Powervolleys](https://www.sofascore.com/volleyball/match/netzhoppers-kw-bestensee-powervolleys-duren/dzjsEzj)
  - Long names truncate ("Friedrichsha..."). Source: [Sofascore volleyball](https://www.sofascore.com/volleyball)
- **Sofascore critique [R]:** an independent Pratt critique faults mixed ordering and ads inside the score list, and icon-only sport navigation. Source: [IXD@Pratt](https://ixd.prattsi.org/2026/09/design-critique-sofascore-ios-app/)
- **FotMob character [V/M]:** black + near-black with white pills, geometric Walsheim, team-coloured player band, cut-out photo. Token names are charmingly specific (`ufoGreen`, `neroBlack`, `fotMobBlack`). Shirt numbers appear at 12/500, white 60%. Sources: [FotMob player](https://www.fotmob.com/players/194165/harry-kane); [FotMob match](https://www.fotmob.com/matches/bayern-munchen-vs-atletico-madrid/37vqh7#6106266)
- **Flashscore character [V/M]:** deep petrol surfaces, hot red, uppercase letter-spaced navigation, and 13px text. A left rail lists country flags and leagues with truncated names ("European Champi..."). Source: [Flashscore standings](https://www.flashscore.com/volleyball/germany/1-bundesliga/standings/)
- **Flashscore imperfections [V]:** umlauts are missing ("Duren", "Luneburg", "Warnemunde") and some clubs appear under different names than elsewhere ("Haching Munchen" where Sofascore's table, with identical numbers, shows "WWK Volleys"). A dense stack of betting ads sits over the content, and an SEO line runs across the very top. Source: [Flashscore standings](https://www.flashscore.com/volleyball/germany/1-bundesliga/standings/)
- **ESPN character [V]:** skewed red logo block on a charcoal bar, a score ticker on top, grey ESPN watermark logos in empty ad slots, team-coloured panels, and first name light / last name heavy. Source: [ESPN player](https://www.espn.com/nba/player/_/id/4065648/jayson-tatum)
- **Apple Sports character [V/R]:** league tint or two-team gradient split, condensed scores, a star by favourites, and a moving cloth-like background the Lickability authors do not expect others to adopt. Sources: [App Store listing](https://apps.apple.com/us/app/apple-sports/id6446788829); [Lickability](https://lickability.com/blog/apple-sports/)
- **VolleyballWorld character [V/M]:** flags instead of crests, coral shirt numbers and ranks, a logo watermark on cards, black tags, and a lime CTA. Source: [VNL schedule](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/schedule/)
- **VBL character [V/M]:** round ball badge that overlaps the nav, oblique Sizmo headings, mixed English and German on a German page ("send", "reset", "Team", "Matches" beside "Tabelle"), and a CMS class name exposing SAMS. Source: [VBL Tabelle](https://www.volleyball-bundesliga.de/cms/home/1_bundesliga_maenner/statistik/tabelle/tabelle_hauptrunde.xhtml)
- **Spielbericht character [V]:** zeros printed as a dot, `L` for libero after the jersey number, boxed digits for the starting rotation per set, clipped team names, and a printed scout credit. Source: [VBL match report 1181](https://live.volleyball-bundesliga.de/2025-26/Men/1181.pdf)
- **Grouping [V/M]:** Sofascore groups by competition with country beneath. Flashscore uses "COUNTRY: League" with a flag. FotMob uses the league name only. ESPN and Apple Sports use league-first grouping. Sources: [Sofascore volleyball](https://www.sofascore.com/volleyball); [Flashscore results](https://www.flashscore.com/volleyball/germany/1-bundesliga/results/); [FotMob](https://www.fotmob.com/); [ESPN scoreboard](https://www.espn.com/nba/scoreboard); [App Store listing](https://apps.apple.com/us/app/apple-sports/id6446788829)
- **Crest backgrounds [M/V]:** Flashscore's header places crests on white 12px tiles, so dark logos remain visible in dark mode. Sofascore and FotMob show crests directly on the surface. Sources: [Flashscore match](https://www.flashscore.com/match/volleyball/karlsruhe-Gt32HqU2/rottenburg-xUFixoUG/?mid=dQX36GfU); [FotMob table](https://www.fotmob.com/leagues/54/table/bundesliga)

### Inferences
- Real crests, flags and jersey numbers are likely the cheapest way to look less generated, since they add irregular shape and colour that no template produces.
- Dots for zeros, `L` markers and boxed rotation digits are native to German volleyball scouting. They could give the product a credible domain feel that football apps cannot copy.
- The imperfections worth keeping are the honest ones: uneven crests, truncation, sparse early-season data, odd ratios. Flashscore's lost umlauts and VBL's mixed languages are defects to avoid, especially for a German product.

### Gaps
- No primary source explains why these teams accept these quirks. Reading them as character rather than technical debt is my interpretation.
- User perception of "AI-generated" versus authentic design was not studied in these sources.

## Which patterns do they deliberately not use?

### Takeaway
Across these data screens I saw no huge KPI tile rows, no marketing hero sections, no decorative icons in coloured circles and no sparkline-per-card dashboards. Whether each omission is deliberate is mostly inferred, since only Apple has spoken publicly about simplicity.

### Cited Findings
- **No oversized numerals in data views [M]:** the table in the first section lists the maximums. Flashscore's 46px score is the largest measured, and it is the single focal point of a match page. Sofascore's volleyball set total is 18px in its main header. Sources: [Flashscore match](https://www.flashscore.com/match/volleyball/karlsruhe-Gt32HqU2/rottenburg-xUFixoUG/?mid=dQX36GfU); [Netzhoppers vs Powervolleys](https://www.sofascore.com/volleyball/match/netzhoppers-kw-bestensee-powervolleys-duren/dzjsEzj)
- **Counter-example, Apple Sports [V]:** it does use large condensed scores, but free-standing on the surface, with no tile or label stack. Source: [App Store listing](https://apps.apple.com/us/app/apple-sports/id6446788829)
- **Counter-example, ESPN [V]:** it does have four bordered mini cards (PPG, APG, 3P%, FG%) with team-coloured caps on a player's Next Game section. Values there are modest in size and compare the player's own numbers in context. Source: [ESPN player](https://www.espn.com/nba/player/_/id/4065648/jayson-tatum)
- **No marketing header [V]:** FotMob's league page opens with crest, name, country and action pills, then tabs, then data. Sofascore's starts with breadcrumb and data cards. Sources: [FotMob table](https://www.fotmob.com/leagues/54/table/bundesliga); [Sofascore 1st Bundesliga](https://www.sofascore.com/volleyball/tournament/germany/1st-bundesliga/501)
- **VolleyballWorld is the partial exception [V/M]:** 34/800 page title, 24/800 phase tabs, 20px gender buttons and repeated WATCH CTAs, all above about 55px rows with few columns. Source: [VNL standings](https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/standings/men/)
- **Stated simplicity [R]:** Eddy Cue described Apple Sports' simple design as intentional. Source: [MacRumors](https://www.macrumors.com/2024/02/21/apple-sports-app-simplicity/)
- **Hierarchy through tabs [R]:** Creative Boom credits Apple Sports with splitting a bracket into per-round tabs and showing lineups on a pitch rather than a list. Source: [Creative Boom](https://www.creativeboom.com/news/this-new-app-from-apple-has-something-important-to-teach-us-about-designing-data/)
- **Little explanatory copy [V]:** abbreviations (P, W, L, SR, DIFF, PTS) go unexplained in the row and are decoded in a legend or accordion at the end. Source: [Sofascore 1st Bundesliga](https://www.sofascore.com/volleyball/tournament/germany/1st-bundesliga/501)

### Inferences
Practical avoid list for the redesign, derived from the above:
- Rows of three or four identical KPI tiles at the top of a page
- A large numeral with a tiny uppercase label as the default building block
- A 56px+ page title with an explanatory subtitle above data
- Equal-weight cards in a neat grid when a table or list would hold the same data
- One radius, one shadow and one accent applied to everything
- Bars or sparklines added where a plain column with a dim comparison value would do

The strongest replacement is a table-first page with a compact header. It would have a 32-36px row grid, 12-14px text, real crests and jersey numbers, form chips, and a single focal score.

### Gaps
- Except for Apple, I found no statement from these teams that they consciously rejected these patterns, so "deliberately" cannot be proven from public sources.
- Search found no FotMob or Flashscore case study from their own designers, and I found no usable Dribbble or Behance case study by actual team members in the searches run.
- Apple Sports details are based on marketing screenshots, which may be idealised and do not show volleyball, and press coverage dates from 2024-2025 with no 2026 hands-on found.

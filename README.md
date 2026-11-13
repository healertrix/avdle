# Avdle

A geography game with the look of an explorer's sketchbook: ink line drawings, stippled shading and bold colour tiles. Every screen has the ☰ menu and an Exit button. Each prompt asks you to pin a country ("Pin a country that borders Germany"). Any correct answer scores, and the less obvious your answer, the more it's worth:

| Tier | Points |
|---|---|
| Well-charted | 100 |
| Mapped | 250 |
| Remote | 450 |
| Uncharted | 700 |
| Here be dragons | 1000 |

Modes: **Daily** (5 prompts, the same for everyone on a given date), **Who lived here?** (name a famous person from where they were born and died), **Warpath** (guess the year), **Infinite mode** (never ends: choose map prompts or Warpath) and **Play with friends** (choose a Longshot room or a Warpath war room).
Settings: hide the country name, hide borders, a 60-second clock, and a Night chart theme.
After each pick you only see your own result; when the five prompts are done, you review every answer on the map.

## Run it

```
npm install
npm start
```

Then open http://localhost:8787. Single-player modes also work by opening `index.html` directly. **Play with friends** needs the server.

## Who lived here?

Two markers show where a famous person was born (★) and died (✝), with the dates. Type the name. The full name, a known alias ("MK Gandhi") or the surname alone ("Stalin") counts, and small typos are forgiven. A surname shared by someone more famous needs the first name too ("Gandhi" means Mahatma; Indira needs "Indira"). A hint ("what they did") halves the points. Then the answer card shows their photo, both places and dates, their age, and a short Wikipedia summary of why they're remembered.

Each game has five people and gets harder as it goes: two household names, then famous, well known, and a deep cut. Points follow the same tiers (100 to 1000), ranked by fame.

The 3,394 people come from Wikidata (CC0). Each one has a birth place and a death place with coordinates, and a Wikipedia article in at least 65 languages; that language count is the fame score. The queries are in `tools/people-queries.md`; `node tools/build-people.mjs` turns the saved results in `raw/people-*.json` into `data/people.js`. The page only downloads that file the first time you play the mode.

## Play with friends

Whoever creates the room sets the rules (the host can change them in the lobby before each game):

- **Number of questions:** 3, 5, 8, 10, 15 or 20.
- **Map vs people:** a slider (steps of 10%) that sets what share of the questions are famous people (born/died here?). The rest are map questions. 0% is all map and 100% is all people. The people questions are spread through the game.
- **How famous are the people?** Rising (starts easy, ends hard), Easy (household names), Medium, or Hard (deep cuts).
- **Time per question:** no clock, or 20, 30, 45, 60 or 90 seconds. The server keeps the time. Just before it runs out, whatever you've pinned or typed is sent; anyone who hasn't answered scores 0 for that question.

Create a room and share the 4-letter code or the invite link (`?room=CODE`). Up to 8 players answer the same questions. Without a clock, once everyone has picked, the next question appears straight away, and each player sees only their own result. If someone has wandered off, the host can tap **Skip**. At the end, the standings show everyone's picks, and **See all answers on the map** shows every answer with everyone's pins. The host can start a rematch.

The server (`server/server.js`) draws the prompts and scores every pick with the same engine as the browser. Players can't see the answers or each other's picks until the game ends. If someone's connection drops, the tab rejoins automatically.

## Warpath (guess the year)

Dates questions elsewhere in Avdle (friend rooms, the infinite mix) use the same dot-matrix world: when one comes up, the map dissolves into dots and zooms into a random empire (the same one for everyone in a room), your year decides the battle behind the answer card, and the dots fly off the screen when the next question is a country or a person.

Its own section, with its own screen and its own war rooms. Open it from the big dark tile on the home page or from the ☰ menu. The map fills the screen, and the panel floats over it (▾ hides it).

- **Pick one of 13 empires:** Maurya (Ashoka), Gupta (Samudragupta), Chola (Rajendra I), Mughal (Akbar), Maratha (Shivaji & the Peshwas), Macedon (Alexander the Great), Persia (Cyrus & Darius), Rome (Trajan), Mongol (Genghis Khan), Ottoman (Suleiman), Japan at the end of the Sengoku jidai (Nobunaga, Hideyoshi & Ieyasu), France (Napoleon) or Inca (Pachacuti). Each one has its lands at their height, a real march route, the real enemies it beat, a boss, and a great monument to build (from the Ashoka Pillar to the Lighthouse of Alexandria, the Great Ger of Karakorum, Himeji Castle and the Arc de Triomphe). Goats, boars, wolves, tigers and dragons turn up too.
- **Each moment** (664 of them, 3200 BC to 2025) puts a foe on the road. Set the year with the slider, the ±1/±10 buttons, or by typing, and switch between BC and AD. The closer you are, the bigger the fight: exact, close, near, rough, way off.
- **Points:** 1000 / 700 / 450 / 250 / 100, multiplied for harder moments (×1 for household names up to ×2 for deep cuts). "Close" depends on how long ago it was (about 0.55 × √years ago).
- **Monument:** an exact year, or a close answer on a hard moment (fame 4–5), builds a fifth of the empire's great monument: the Ashoka Pillar, the Iron Pillar, Brihadeeswarar Temple, the Taj Mahal, Raigad Fort, the Colosseum, the Süleymaniye Mosque or Machu Picchu.
- **Difficulty slider** (Recruit to Legend) and **questions** (5 to 20, or ∞ for an endless march: the road loops in laps of 10 and every 10th foe is a boss). **War rooms:** the host picks the empire, difficulty, questions and a clock (none, or 20 to 90 seconds); everyone fights the same foes. With a clock, the server waits 10 seconds between rounds before the next clock starts, so watching your fight doesn't eat into your time. Warpath rooms only play Warpath.
- Files: `data/events.js` (the moments: `[year, fame 1-5, category, moment, fact]`, with negative years for BC), `js/warpath.js` (scoring, which the server also uses), `js/warpath-empires.js` (maps, routes, enemies, monuments) and `js/warpath-ui.js` (the dot-matrix screen).

## On phones (install it like an app)

Avdle is an installable web app (`manifest.webmanifest`, icons in `icons/`). In Chrome on Android, ☰ → **Install app**; on iPhone, Safari's Share → **Add to Home Screen** (☰ → Install app explains it). It then opens full screen with its own icon, and long-pressing the icon offers Daily, Warpath and Crorepati.

`js/native.js` makes it feel like a native app:

- **Back button / back gesture** closes whatever is on top (a dialog, the country panel, Warpath, Crorepati) or leaves the current game (with the usual "Leave this game?" check), instead of leaving the site. On the home screen, Back exits as usual.
- **Haptics** on Android: a light tick on main buttons, a double buzz for a correct pin and a single one for a miss (off when the phone asks for reduced motion).
- **Swipe to close**: the ☰ menu slides away to the left; dialogs are bottom sheets on phones and slide down.
- The status bar takes the colour of the screen (dark in Warpath and Crorepati), and there is no pull-to-refresh, rubber-band bounce or long-press text selection on buttons.

The PNG icons are drawn by `node tools/build-icons.mjs` (no dependencies).

## Put it online (Cloudflare Tunnel)

Quick tunnel (no account; you get a random `*.trycloudflare.com` address that changes each time):

```
npm start
cloudflared tunnel --url http://localhost:8787
```

For a permanent address on your own domain: run `cloudflared tunnel login`, then `cloudflared tunnel create longshot`, then `cloudflared tunnel route dns longshot play.yourdomain.com`, then `cloudflared tunnel run --url http://localhost:8787 longshot`.

The server only serves `index.html`, `css/`, `js/`, `data/` and `vendor/`. Everything else (`server/`, `raw/`, `tools/`, `package.json`) returns 404.

## Where the questions come from

Nobody writes the questions by hand. They come from data, and every answer can explain itself.

1. **Country facts.** `tools/build-data.mjs` builds `data/countries.js` (197 countries) from `raw/`:
   [mledoze/countries](https://github.com/mledoze/countries) (languages, borders, capitals, currencies, regions, area) and World Bank 2023 population.
   Templates in `js/prompts.js` turn these into prompts like "borders Germany", "uses a dinar" or "name ends in -stan".
2. **Trivia sets** in `data/facts.js`, built from:
   - `tools/facts-source.mjs`: hand-checked sets (rivers, seas, mountain ranges, deserts, wildlife ranges, Disney parks, New 7 Wonders, Olympics and World Cup hosts, spaceflight, CERN). Each answer has a "why" line, a source, and a Wikipedia topic.
   - `tools/facts-more.mjs`: where things began (martial arts, sports, dishes, drinks, cheeses, spices, music, inventions, games), famous journeys (Columbus, da Gama, Magellan, Darwin, Che Guevara, Einstein), history (USSR, Yugoslavia, Austria-Hungary, the Inca, the ancient wonders), culture (scripts, religions, festivals), politics (EU, NATO, G7, G20, OPEC, nuclear powers, Antarctic claims), flags, lakes, rainforests, reefs, volcanoes, waterfalls, more wildlife and sport. Open-ended topics name their items in the question ("one of these martial arts: karate, judo, ..."), so the answer list is always complete.
   - Computed from the map: which countries the Equator, the tropics, the Arctic Circle and the Prime Meridian cross (with small hand fixes for islands too small for the map).
   - Top 10 producers of coffee, cocoa, rice, wheat, bananas, maize, potatoes, soybeans, sugar cane, avocados, oranges (FAO), and oil, gas and coal (Energy Institute), via Our World in Data CSVs in `raw/owid-*.csv`.
3. **Learn more**: tapping any country shows why it fits, its key facts, every trivia fact about it, and a live Wikipedia summary.

About 830 prompts today. Rarity is ranked within each prompt by how well known each answer is (population and size, plus a small boost for famous small places). The least known ~10% are *Here be dragons*.

### Adding more questions

- **New trivia set**: add an entry to `CURATED` in `tools/facts-source.mjs` (or `MORE` in `tools/facts-more.mjs`), then run `node tools/build-data.mjs`. The answer list must be complete, or correct players get marked wrong. That's why yearly-changing lists such as Michelin-starred countries aren't included unless you rebuild them from a dated source.
- **New production ranking**: download another Our World in Data grapher CSV into `raw/` and add a line to `PRODUCE` in the build script.
- **New template**: add an `add(...)` call in `buildPool()` in `js/prompts.js`.
- After any change, run `node tools/check-prompts.mjs`. It checks every prompt, every explanation, and about 35 known answer lists.

## Performance

The map is a `<canvas>`. Country outlines are projected once into `Path2D` shapes, so panning and zooming only change a transform and redraw on the next animation frame. Zoomed out, it uses a lighter outline set (110m) and skips anything off-screen. There are no web fonts (it uses the system font), no CSS filters and no blur.

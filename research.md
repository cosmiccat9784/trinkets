# Research: Small "Pointless" Web Toys & Games Sites

**Sites studied:** [BoredButton.com](https://boredbutton.com), [TheUselessWeb.com](https://theuselessweb.com), plus the destination sites both buttons link to.
**Method:** Live inspection of production HTML/CSS/JS (Aug 2026), including The Useless Web's actual button source code and its editorial/archival pages.
**Purpose:** Distill what makes these sites feel good, how they work mechanically, and what Trinkets can steal.

---

## 1. WHAT — the genre, defined

These belong to a loose genre sometimes called **the useless web**: single-purpose, zero-stakes websites that exist to deliver one small moment of delight, absurdity, or satisfaction. No accounts, no goals, no monetized engagement loops. They are the web's equivalent of a fidget toy or a bubble-wrap sheet.

Two kinds of sites matter here:

| Kind | Examples | Job |
|---|---|---|
| **Hubs / aggregators** | BoredButton, The Useless Web | A single big button that flings you at a random curated site. Solve boredom. |
| **Destinations / toys** | puginarug.com, eelslap.com, hackertyper.com, cat-bounce.com | One idea, one interaction, experienced in 10–120 seconds. |

### The destination taxonomy (from The Useless Web's actual ~130-site roster)

Reading their real site list (`theuselessweb.com/js/uselessweb.js`), destinations cluster into clear families:

1. **Daily-puzzle toys (the ".toys" empire)** — sliding.toys (8-puzzle *daily*), maze.toys (*daily*), memory.toys, clicking.toys (peg solitaire), card.toys (klondike), dice.toys (greedy pig), number.toys, checkboxrace.com, cruel.toys (self-aware "unfair" games), patience.toys. One maker runs most of the `.toys` TLD namespace — a whole brand built on cheap pun domains.
2. **Musical toys** — musical.toys (polyrhythm, pendulum waves, tetrachord), binarypiano.com, mondrianandme.com. Click anything → it sounds good no matter what.
3. **Sensory / fidget / "satisfying"** — puginarug.com (a rug you can plug), papertoilet.com (infinite unrolling paper), paint.toys/sand (falling sand sim), zen-garden, symmetry painter, wigglyme.com, zoomquilt.org (infinitely-zooming collaborative art), bouncingdvdlogo.com (will it hit the corner?).
4. **One-joke gag sites** — heeeeeeeey.com, eelslap.com (slap an eel across a man's face), burymewithmymoney.com, thatsthefinger.com, crouton.net (a crouton), ihasabucket.com, wowenwilsonquiz.com ("wow" per second). The domain name IS the joke.
5. **Zen / anti-anxiety** — thezen.zone, drawing.garden, patience-is-a-virtue.org, and the late great donothingfor2minutes.com ("Do nothing for 2 minutes. Listen to the ocean. Don't touch mouse/keys.").
6. **Tech-nostalgia jokes** — hackertyper.com (mash keys, look like a movie hacker), onesquareminesweeper.com, oct82.com, cursoreffects.com, blankwindows.com (fake app windows), thevintageweb.com.
7. **Absurdist existential bits** — existentialcrisis.com, greatbignothing.com, boringboringboring.com, notdayoftheweek.com, weirdorconfusing.com, potatoortomato.com.

---

## 2. HOW — mechanics, reverse-engineered

### BoredButton (est. 2006, Tyler Cole / Bored Button LLC)

Radical minimalism. The entire homepage is:

- One centered column, **300px wide**, ~24px vertical margin.
- A **150×150 red button image** wrapped in `<a href="/random">`.
- A giant `h1`: "**B**ored?" at **92px** with hand-tuned negative letter-spacing per letter (`tight-2`, `tight-3` classes).
- SEO keyword-stuffed copy: *"I am bored. I'm so bored. I'm bored at school. I'm bored at work. I'm bored to tears. I'm bored to death."* — repeated verbatim in `<meta keywords>`. This is deliberate search-bait for bored people googling their feelings.
- `/random` is a **server-side redirect** to a random curated site. Zero client-side logic needed on the homepage.
- Monetization: a single AdSense rectangle. Analytics: GA4. Footer: Home | About | Add (submit your site) | Terms | Privacy.
- Responsive via just two breakpoints (414px, 320px). It fits any phone made in the last decade.

**Key insight:** the entire product is *one anchor tag*. Friction is essentially zero.

### The Useless Web (built Oct 2012 by Tim Holman during Hurricane Sandy)

More theatrical, but still one interaction. Its actual button logic (`uselessweb.js`) contains genuinely clever mechanics worth stealing:

```js
// 1. THE DECK MECHANIC — no repeats until you've seen everything
var sites = sitesList.slice();            // copy full list (~130 URLs)
function selectWebsite() {
  var range = Math.min(randomRange /* = 6 */, sites.length);
  var index = Math.floor(Math.random() * range);
  var site = sites[index];
  sites.splice(index, 1);                 // remove from deck
  return site;
}
```

- **Deck, not dice:** each click removes a site from the pool. You never see the same site twice until the deck empties (then it silently refills). Feels fresh every session.
- **Persistence:** the remaining deck is saved to `localStorage['sitelist-mar-19']`. Your "seen it" state survives reloads. On load, stored decks are filtered against the master list so stale/spammy entries can't leak back in.
- **Recency weighting:** the random pick comes from the first 6 entries of the remaining deck — newly added sites get disproportionate exposure before being shuffled out naturally.
- **Opens in a new tab** (`window.open`) — the hub stays open as home base. You can binge without losing your place.
- **Device gating:** `window.matchMedia('(hover: hover) and (pointer: fine)')` detects real mice and filters desktop-only sites out on touch devices.
- **First-click copy change:** the headline flips "TO A" → "TO ANOTHER" after the first press. Tiny, but rewards the repeat action and teaches the loop instantly.
- Fires a GA event per click to track engagement.

**Page chrome:** stacked shrinking headlines (`TAKE ME / TO A / USELESS / WEBSITE →PLEASE←`) in **Josefin Slab** (Google Fonts), typewriter-ish and playful. Full JSON-LD `WebSite` schema, OG/Twitter cards, canonical URL. Ads via Ramp/Intergient.

### Curation & maintenance (the hidden cost)

- Both hubs accept submissions (Google Form / `/add` page). Curation IS the product.
- Link rot is the genre's #1 operational problem. The Useless Web's JS literally has commented-out graves: `// 'https://thepigeon.org/', expired`, `// http://tunnelsnakes.com/, fails modern TLS`, `// dead: 404 at root, revivable from Wayback 2026-03-26`.
- Their answer is a beautiful editorial move: **[/sites-we-lost](https://theuselessweb.com/sites-we-lost/)** — a memorial museum of dead sites, each annotated with its cause of death: *"DNS gone"*, *"Domain squatted by gambling rings"*, *"Hijacked with ad injection"*, *"Browsers dropped Flash"*, *"purple.com was bought by Purple Innovation, the mattress company"*. Where possible they **rebuilt and now host the originals themselves** (Zombocom works again).
- Each surviving site gets a story page ([/sites](https://theuselessweb.com/sites/)): who made it, why, how it landed on the button.

---

## 3. STYLE — what it looks like

Common visual language across hubs and destinations:

- **One screen, one action.** No nav bars, no hero carousels, no cookie banners front-and-center. The page IS the button.
- **Typography does the heavy lifting.** Giant display type (92px "Bored?"), dramatic size hierarchies (h1→h5 stacking), tight/negative letter-spacing, expressive fonts (Josefin Slab) instead of design systems.
- **Deliberately "unfinished" aesthetic.** Default system fonts, plain backgrounds, hand-tuned magic numbers in CSS. It reads as *human-made*, which is the point.
- **Full-bleed destinations.** Toy sites fill the viewport edge-to-edge. The content is the interface.
- **Color as event, not palette.** randomcolour.com, rrrgggbbb.com, coloursquares.com — the whole site changes color on interaction.
- **Sound on first interaction** (browser autoplay rules shaped this): musical toys, corgiorgy, chihuahuaspin all wake up audibly when you first click/touch.
- **Cursor play.** pointerpointer.com finds a photo of someone pointing exactly at your cursor. cursoreffects.com replaces your cursor entirely. The mouse is the star instrument.

## 4. FEEL — why they're satisfying (the psychology)

1. **Instant payoff.** Click → something happens in <100ms. No loading, no tutorials, no sign-up walls.
2. **Variable reward.** Randomness makes every click a slot-machine pull. The deck mechanic guarantees novelty.
3. **Zero stakes.** No score, no fail state, no streak to protect, no account. Play is purely intrinsically motivated — the opposite of modern engagement-farming.
4. **Permission to be pointless.** The sites are *honest* about their uselessness ("TAKE ME TO A USELESS WEBSITE"). This disarms the guilt of wasting time and is central to the charm. Deadpan self-awareness is the house voice: imperative mood, second person, no exclamation points wasted ("Go ahead, give it a try." / "A crouton.")
5. **Micro-session sizing.** 30 seconds of stimulation fits the exact shape of a boredom gap at work or school (see BoredButton's literal SEO targeting "I'm bored at work").
6. **Sensory tactility.** Physics-y drag, squash, spill, bounce, unroll, slap. Things respond continuously to input, not in discrete clicks. This is the "satisfying" feeling users mean.
7. **Completionism-lite.** "I've seen 87 of 130" scratches the collection itch without dark-pattern pressure.
8. **Nostalgia & preservation.** Flash-era artifacts lovingly resurrected (Zombocom rebuilt, Hampster Dance archived). The genre doubles as folk-museum of the old web.
9. **Craft-in-smallness.** The Pigeon mk1 was *237 bytes of HTML, one centered pigeon.* Restraint itself signals care and becomes memorable.

## 5. WHERE — the ecosystem

- **Hosting:** cheap personal domains chosen for pun value (crouton.net, corndog.io, crapo.la — "the TLD is the joke"), plus the `.toys` TLD as a coherent brand umbrella, plus free static hosts (GitHub Pages) for revivals.
- **Stack:** plain HTML/CSS/vanilla JS, no build step, no framework, no backend (except BoredButton's one redirect endpoint). Google Fonts + GA + an ad tag. Sites load in one round trip.
- **Discovery loop:** Reddit/Twitter shares of individual toys → hub submission forms → hub randomness sends traffic back out to long-tail toys. The hub is the distribution layer for a thousand tiny creators.
- **Money:** display ads only (AdSense, Ramp). Enough to cover domains and coffee; nobody's getting rich. The currency that actually accumulates is affection/link equity.
- **Mortality:** DNS lapses, expired domains, squatters, hijacks, Flash deprecation kill ~most sites within a decade. Preservation (self-hosting revivals, Wayback) is now part of the culture.

## 6. TAKEAWAYS FOR TRINKETS

Directly applicable, mapped to our existing TODOs in `progress.md`:

1. **Cut time-to-first-interaction to zero.** Every game should be playable within one click and need no instructions — teach through the first interaction, like TUW's "TO A → TO ANOTHER" trick.
2. **Steal the deck.** Our shuffle button should deal *without replacement* (localStorage-persisted) so players never see repeats until the catalog cycles.
3. **Deadpan copy pass.** Rewrite UI strings in the house voice: imperative, second-person, dryly self-aware. Names like "Button Bash" are right; add flavor lines ("Go on. Press it.").
4. **Ship micro-toys alongside games.** The roster says fidget/sensory toys (sand, symmetry paint, rug-plugging) outperform complex games for pure satisfaction. Cheap to build, huge delight-per-line-of-code. A couple of `.toys`-style daily puzzles would add ritual.
5. **Sound, gated correctly.** Audio on first interaction only; respect autoplay policies; keep the sound toggle prominent (already on our TODO).
6. **Micro-interactions over features.** Our TODO's particle flashes/confetti/hover states matter more than leaderboards or accounts. These sites prove retention comes from *feel*, not progression systems. Deprioritize accounts/ratings/XP.
7. **Embrace restraint in scope per game.** One mechanic, full-bleed, no menus inside the game modal. 237 bytes of pigeon.
8. **Own the archive instinct.** A "hall of fame"/stats page ("you've played 34 of 42 trinkets") gives completionism-lite without accounts.
9. **Keep it static and fast.** No backend, no login. The genre's trust comes from feeling handmade and loading instantly.

---

### Sources

- `https://boredbutton.com` — homepage HTML/CSS (inspected Aug 2026)
- `https://theuselessweb.com` — homepage HTML + `js/uselessweb.js` (full button algorithm, inspected Aug 2026)
- `https://theuselessweb.com/sites/` — current roster intro
- `https://theuselessweb.com/sites-we-lost/` — death registry of ~50 lost sites with causes

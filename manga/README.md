# Manga slideshows ("Sora in Seoul")

Black-and-white manga episodes posted as 1080x1920 photo slideshows. This pipeline is separate from the quiz carousel and doesn't change it.

Each episode is 8 slides: a cover, five story pages (a four-beat gag), a lesson slide where Horang explains the Korean line, and a CTA. The art is custom for every episode and contains **no text**; the renderer draws every balloon, caption and sound effect, so the Korean is always correct.

## Making an episode

1. **Write it.**
   ```
   npm run manga:episode -- "<premise: the four beats>" --line "봉투 필요하세요?" --id ep02-name --episode 2
   ```
   This writes `output/manga/<id>/episode.json` and checks it: layouts, panel counts, shapes, refs, and that every piece of text points at a panel on its slide. Read the Korean before going on.
2. **Make the art.** James makes the panels in ComfyUI (below) and saves them as `output/manga/<id>/panels/<panel id>.png`. To review an episode before that, make stand-ins with GPT Image:
   ```
   npm run manga:test-art -- output/manga/<id>
   ```
   That writes `test-panels/`. James's panels always win over test panels, so they can be swapped in one at a time.
3. **Render.**
   ```
   npm run manga:slides -- output/manga/<id>
   ```
   This writes `slides/slide-1.png` to `slide-8.png` and `slides/metadata.json`. A panel with no art renders as a grey box, and the command lists which panels are missing.
4. **Check** every slide: no balloon over a face, nothing cut off, and the Korean is right.
5. **Publish** like any slideshow:
   ```
   node video/scripts/publish-slides.mjs output/manga/<id>/slides
   ```

`examples/ep01-bongtu/` is a complete episode with test art. Run `npm run manga:slides -- manga/examples/ep01-bongtu --out output/manga/ep01` to see the whole thing.

## Format

- Page: 1080x1920, white, 48 px side margins, 28 px gutters, 6 px black panel borders. Text stays out of the top 110 px and the bottom 220 px, where the app's UI sits.
- Layouts: `cover` (title block with one tall panel under it), `splash` (one tall panel), `two` (two half panels stacked), `three` (three strip panels stacked), `lesson` and `cta` (stock art from `stock/`, with text on top).
- There are only three art shapes, and the renderer crops each one to fit its panel:

| Shape | Aspect | Qwen Image size |
|---|---|---|
| `tall` | 2:3 | 1056x1584 |
| `half` | 4:3 | 1472x1104 |
| `strip` | 16:9 | 1664x928 |

- Text: `balloons` (Korean line plus a small English translation), `captions` (short English narration), `sfx` (big outlined Korean with English underneath). Each one has `at`: `tl`, `tr`, `bl` or `br`, and the panel's prompt asks for empty space in the same corner.

## Making the art locally (Qwen Image 2.1 Edit in ComfyUI)

- Load the reference crops from `model-sheets/` into the image slots in the order of the panel's `refs` (`sora-ref.png` into image_1, `kkachi-ref.png` into image_2, and so on). The prompts already say `<image1>` and `<image2>`. Use the full sheet when you need an expression from its bottom row.
- Prompt = the episode's `style_prefix`, then "Same drawing style and character designs as the reference images.", then the panel's `prompt`. cfg is 1.0, so negatives do nothing; the prefix already says no text, no bubbles and no color.
- Size comes from the panel's `shape` (table above). Make 4 seeds and pick one.
- Panels with no refs (strangers only) use plain text-to-image with the same prefix.

## Cast (model sheets in `model-sheets/`)

- **Sora:** blunt black bob, light jeogori with a dark collar band and long goreum bow, dark screentone chima. Deadpan and sincere.
- **Kkachi:** round black-and-white magpie with a very long tail (without it he reads as a penguin). His beak sits between his eyes and he has no mouth. Acts with his eyes only and never talks.
- **Horang:** tiger-eared teacher, spiky light hair with black stripes, cheek stripes, dark durumagi, ringed tail. He appears only on the lesson and CTA slides.

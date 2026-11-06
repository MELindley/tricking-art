# Project memory

## What "trick art" is

**Trick art** (this project, TRICK/ART) is generative motion art made from *tricking*.

Tricking is an acrobatic movement discipline. It blends martial-arts kicks, gymnastics and breakdance-style flips and twists into fast, fluid combinations such as cork, gainer, butterfly twist and aerial. Trick art turns a short clip of a trick (about 10–15 s) into a single still or animated artwork. The art traces the path, rhythm and energy of the body through the air, instead of showing the footage itself.

How it works in this repo:
- Frames are sampled from the clip, and pose estimation (MediaPipe, 33 landmarks) finds the joints in each frame.
- From the joints we derive velocity, body energy, air time and a trick **phase**: idle → load → launch → peak → land.
- Those signals drive art modes: Motion Trail, Mandala, Ghost Stack and Flow Field. The user can restrict the art to chosen body parts or trick phases.
- Output is sized for Instagram Reels / Stories (1080×1920) and exported as PNG or video.
- Everything runs in the browser, with no backend and no uploads.

In short, trick art is the visual signature of a trick: its trajectory, timing and energy, drawn as art.

# Meta Motion Ads

Motion-design ads that live inside the video instead of interrupting it, for Facebook and Instagram creators.

Built solo for the [Meta Global AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) (Indie Developer track, Oct 27 to Nov 4, 2026). Everything in this repository was written during the hackathon.

## The idea

Mid-roll ads cut a video at a random moment and viewers leave. Meta Motion Ads finds the right moment in the video instead: someone is about to jump, the frame freezes, the person is cut out from the background, and a short motion-design ad tied to the action plays ("He's motivated. Are you motivated to launch your website?"). A cursor clicks, and the video resumes.

## How Meta's models are used

| Step | Model |
|---|---|
| Watch the video and pick the moment to freeze | Muse Spark (video input) |
| Avoid cutting someone mid-sentence | Muse Voice Transcribe |
| Cut out the person so the ad can play around them | SAM 3.1 |
| Write the motion-design animation code for this scene and advertiser | Muse Wonder |
| Generate product visuals | Muse Image |
| Check every rendered frame (readable text, face not covered) and request fixes | Muse Glimmer, self-hosted on our own GPUs |

## Repository layout

```
pipeline/   moment detection, transcription, segmentation (Python)
render/     motion-design rendering (Remotion)
app/        upload a video, choose an advertiser, preview and export
cluster/    serving Muse Glimmer on our own GPUs (Slurm)
docs/       notes and demo material
```

## Status

Work in progress during the hackathon.

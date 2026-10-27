"""Synthetic test clip with known ground truth.

A flat scene with a poster, filmed by a slowly drifting hand-held camera, with a hand-like
blob passing in front of the poster. Ground truth: poster corners and occluder mask per frame.
"""

import cv2
import numpy as np

WORLD_W, WORLD_H = 1600, 1000
POSTER = np.float64([[620, 240], [1000, 240], [1000, 740], [620, 740]])


def _world(rng):
    base = rng.normal(0.5, 0.18, (WORLD_H // 8, WORLD_W // 8, 3)).clip(0, 1)
    world = cv2.resize(base.astype(np.float32), (WORLD_W, WORLD_H), interpolation=cv2.INTER_CUBIC)
    world = cv2.GaussianBlur(world, (0, 0), 3) * 0.5 + 0.25
    for _ in range(60):
        x, y = rng.integers(0, WORLD_W), rng.integers(0, WORLD_H)
        w, h = rng.integers(20, 160, size=2)
        cv2.rectangle(world, (int(x), int(y)), (int(x + w), int(y + h)), rng.uniform(0.1, 0.9, 3).tolist(), -1)
    x0, y0 = POSTER[0].astype(int)
    x1, y1 = POSTER[2].astype(int)
    poster = world[y0:y1, x0:x1]
    poster[:] = (0.92, 0.9, 0.88)
    for _ in range(25):
        cx, cy = rng.integers(0, x1 - x0), rng.integers(0, y1 - y0)
        cv2.circle(poster, (int(cx), int(cy)), int(rng.integers(8, 40)), rng.uniform(0.1, 0.8, 3).tolist(), -1)
    text = np.zeros(poster.shape[:2], np.uint8)
    for i in range(6):
        cv2.putText(text, "CONCERT", (20, 60 + 70 * i), cv2.FONT_HERSHEY_DUPLEX, 1.6, 255, 3)
    poster[text > 0] = (0.1, 0.1, 0.2)
    return world


def _camera(t, n, rng_path):
    s = t / max(n - 1, 1)
    ang = np.deg2rad(2.0 * np.sin(2 * np.pi * s) + rng_path[0][t])
    tx = 40 * np.sin(2 * np.pi * 0.7 * s) + rng_path[1][t]
    ty = 25 * np.sin(2 * np.pi * 1.1 * s + 1) + rng_path[2][t]
    scale = 0.62 + 0.03 * np.sin(2 * np.pi * 0.5 * s)
    c, si = np.cos(ang) * scale, np.sin(ang) * scale
    h = np.array([[c, -si, 0], [si, c, 0], [0, 0, 1]])
    h[0, 2] = 480 - scale * 800 + tx
    h[1, 2] = 270 - scale * 500 + ty
    h[2, 0] = 4e-5 * np.sin(2 * np.pi * s)
    h[2, 1] = 3e-5 * np.cos(2 * np.pi * s)
    return h


def make_clip(n=90, size=(960, 540), seed=0):
    """Return frames, poster corners per frame (n, 4, 2) and occluder masks per frame."""
    rng = np.random.default_rng(seed)
    world = _world(rng)
    jitter = [cv2.GaussianBlur(rng.normal(0, 1, (n, 1)), (0, 0), 2).ravel() * k for k in (0.15, 2.0, 2.0)]
    frames, quads, occs = [], [], []
    for t in range(n):
        h = _camera(t, n, jitter)
        img = cv2.warpPerspective(world, h, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        quad = cv2.perspectiveTransform(POSTER.reshape(-1, 1, 2), h).reshape(4, 2)
        occ = np.zeros(size[::-1], np.uint8)
        if 30 <= t < 66:
            k = (t - 30) / 35
            cx = int(quad[:, 0].min() - 60 + k * (quad[:, 0].max() - quad[:, 0].min() + 120))
            cy = int(quad[:, 1].mean() + 40)
            cv2.ellipse(occ, (cx, cy), (55, 90), 20, 0, 360, 255, -1)
            img[occ > 0] = (0.55, 0.65, 0.85)
        img = img + rng.normal(0, 0.012, img.shape).astype(np.float32)
        frames.append((np.clip(img, 0, 1) * 255).astype(np.uint8))
        quads.append(quad)
        occs.append(occ)
    return frames, np.array(quads), occs


def make_texture(w=800, h=1000):
    """A stand-in brand visual for tests and demos."""
    tex = np.zeros((h, w, 3), np.uint8)
    for y in range(h):
        tex[y] = (40 + 120 * y // h, 30, 200 - 100 * y // h)
    cv2.putText(tex, "MOTION", (60, 420), cv2.FONT_HERSHEY_DUPLEX, 4, (255, 255, 255), 10)
    cv2.putText(tex, "ADS", (60, 600), cv2.FONT_HERSHEY_DUPLEX, 5, (60, 230, 255), 12)
    cv2.rectangle(tex, (20, 20), (w - 20, h - 20), (255, 255, 255), 8)
    return tex

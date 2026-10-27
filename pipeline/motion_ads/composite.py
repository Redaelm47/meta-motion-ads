"""Placing a flat ad texture onto a tracked surface so it looks filmed, not pasted."""

import cv2
import numpy as np

from .geometry import quad_aspect


def fit_texture(texture, aspect):
    """Center-crop the texture to the surface aspect ratio (width / height)."""
    h, w = texture.shape[:2]
    if w / h > aspect:
        nw = int(round(h * aspect))
        x = (w - nw) // 2
        return texture[:, x:x + nw]
    nh = int(round(w / aspect))
    y = (h - nh) // 2
    return texture[y:y + nh]


def _luma(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0


def noise_level(frame, mask):
    """Standard deviation of sensor noise inside `mask`, from the high-frequency residual."""
    g = _luma(frame)
    resid = g - cv2.GaussianBlur(g, (0, 0), 1.0)
    vals = resid[mask > 0]
    if vals.size < 50:
        return 0.0
    mad = np.median(np.abs(vals - np.median(vals)))
    return float(1.4826 * mad)


class Compositor:
    """Holds one ad texture and composites it into frames.

    Lighting is transferred relative to the first frame: whatever darkens or brightens the
    surface over time (a shadow passing, exposure changes) darkens or brightens the ad too.
    The surface's own printed content is not transferred, since it is the same in every frame.
    shading: 0 keeps the ad flat, 1 transfers the full change.
    """

    def __init__(self, texture, first_frame, first_quad, shading=1.0, grain=True, edge_softness=0.6, seed=0):
        tex = texture
        alpha = None
        if tex.ndim == 3 and tex.shape[2] == 4:
            alpha = tex[:, :, 3]
            tex = tex[:, :, :3]
        aspect = quad_aspect(np.asarray(first_quad, np.float64))
        self.texture = fit_texture(tex, aspect).astype(np.float32) / 255.0
        self.alpha = None if alpha is None else fit_texture(alpha, aspect).astype(np.float32) / 255.0
        self.shading = shading
        self.grain = grain
        self.edge_softness = edge_softness
        self.rng = np.random.default_rng(seed)
        th, tw = self.texture.shape[:2]
        self._src = np.float32([[0, 0], [tw, 0], [tw, th], [0, th]])
        self._blur = max(2.0, 0.04 * np.hypot(tw, th))
        self._ref = self._surface_light(first_frame, first_quad, None)

    def _surface_light(self, frame, quad, occluder):
        """Low-frequency luminance of the surface, seen from the front at texture resolution."""
        th, tw = self.texture.shape[:2]
        to_tex = cv2.getPerspectiveTransform(np.float32(quad), self._src)
        luma = cv2.warpPerspective(_luma(frame), to_tex, (tw, th), flags=cv2.INTER_AREA)
        valid = np.ones((th, tw), np.float32)
        if occluder is not None:
            valid = 1 - cv2.warpPerspective((occluder > 0).astype(np.float32), to_tex, (tw, th))
        low = cv2.GaussianBlur(luma * valid, (0, 0), self._blur)
        weight = cv2.GaussianBlur(valid, (0, 0), self._blur)
        return low / np.maximum(weight, 1e-3)

    def __call__(self, frame, quad, occluder=None):
        h_img, w_img = frame.shape[:2]
        th, tw = self.texture.shape[:2]
        hm = cv2.getPerspectiveTransform(self._src, np.float32(quad))

        tex = self.texture
        if self.shading > 0:
            ratio = self._surface_light(frame, quad, occluder) / np.maximum(self._ref, 1e-3)
            ratio = np.clip(1 + self.shading * (ratio - 1), 0.2, 2.0)
            tex = tex * ratio[..., None]

        warped = cv2.warpPerspective(tex, hm, (w_img, h_img), flags=cv2.INTER_CUBIC,
                                     borderMode=cv2.BORDER_CONSTANT)
        cover = np.ones((th, tw), np.float32) if self.alpha is None else self.alpha
        alpha = cv2.warpPerspective(cover, hm, (w_img, h_img), flags=cv2.INTER_LINEAR,
                                    borderMode=cv2.BORDER_CONSTANT)
        if self.edge_softness > 0:
            alpha = cv2.GaussianBlur(alpha, (0, 0), self.edge_softness)
        region = alpha > 0.5

        out = frame.astype(np.float32) / 255.0

        if self.grain:
            sigma = noise_level(frame, region.astype(np.uint8))
            if sigma > 0:
                warped = warped + self.rng.normal(0, sigma, warped.shape[:2]).astype(np.float32)[..., None]

        if occluder is not None:
            occ = cv2.GaussianBlur((occluder > 0).astype(np.float32), (0, 0), 0.8)
            alpha = alpha * (1 - occ)

        a = alpha[..., None]
        out = out * (1 - a) + np.clip(warped, 0, 1) * a
        return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)

"""Tracking a planar surface through a video.

Every tracker returns one quad per frame (see geometry.py). Two implementations:

- FeatureTracker: starts from 4 corners on the first frame, follows feature points that lie
  on the surface, and refines each frame against the first one so the error does not drift.
  Needs no model; useful for development and as a fallback.
- MaskTracker: turns per-frame masks of the surface (from SAM 3.1 video tracking) into quads.
"""

import cv2
import numpy as np

from .geometry import align_quad, apply_h, quad_from_mask, quad_mask


def _gray(frame):
    return cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame


class FeatureTracker:
    def __init__(self, max_points=500, ecc=True):
        self.max_points = max_points
        self.ecc = ecc

    def track(self, frames, first_quad, occluders=None):
        """`occluders`: optional per-frame masks of things in front of the surface (hands, people)."""
        q0 = np.asarray(first_quad, np.float64)
        grays = [_gray(f) for f in frames]
        shape = grays[0].shape
        template, offset, tmask = self._template(grays[0], q0, occluders[0] if occluders is not None else None)

        h = np.eye(3)
        quads = [q0.copy()]
        for t in range(1, len(grays)):
            prev_quad = quads[-1]
            occ_prev = occluders[t - 1] if occluders is not None else None
            occ_cur = occluders[t] if occluders is not None else None
            dh = self._frame_to_frame(grays[t - 1], grays[t], prev_quad, occ_prev, occ_cur)
            h = dh @ h
            if self.ecc and (occ_cur is None or not occ_cur[quad_mask(apply_h(h, q0), shape) > 0].any()):
                h = self._refine(template, offset, tmask, grays[t], h)
            quads.append(apply_h(h, q0))
        return np.array(quads)

    def _frame_to_frame(self, g0, g1, quad, occ0, occ1):
        mask = quad_mask(quad, g0.shape, erode=3)
        if occ0 is not None:
            mask[occ0 > 0] = 0
        p0 = cv2.goodFeaturesToTrack(g0, self.max_points, 0.01, 5, mask=mask)
        if p0 is None or len(p0) < 12:
            return np.eye(3)
        lk = dict(winSize=(21, 21), maxLevel=4,
                  criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))
        p1, st, _ = cv2.calcOpticalFlowPyrLK(g0, g1, p0, None, **lk)
        pb, stb, _ = cv2.calcOpticalFlowPyrLK(g1, g0, p1, None, **lk)
        good = (st.ravel() == 1) & (stb.ravel() == 1) & (np.linalg.norm((pb - p0).reshape(-1, 2), axis=1) < 1.0)
        if occ1 is not None:
            xy = np.round(p1.reshape(-1, 2)).astype(int)
            inside = (xy[:, 0] >= 0) & (xy[:, 1] >= 0) & (xy[:, 0] < g1.shape[1]) & (xy[:, 1] < g1.shape[0])
            hit = np.zeros(len(xy), bool)
            hit[inside] = occ1[xy[inside, 1], xy[inside, 0]] > 0
            good &= ~hit
        if good.sum() < 12:
            return np.eye(3)
        dh, _ = cv2.findHomography(p0[good], p1[good], cv2.RANSAC, 1.5)
        return dh if dh is not None else np.eye(3)

    @staticmethod
    def _template(g0, q0, occ0):
        x, y, w, h = cv2.boundingRect(np.round(q0).astype(np.int32))
        pad = 4
        x0, y0 = max(x - pad, 0), max(y - pad, 0)
        x1, y1 = min(x + w + pad, g0.shape[1]), min(y + h + pad, g0.shape[0])
        tmask = quad_mask(q0, g0.shape, erode=2)
        if occ0 is not None:
            tmask[occ0 > 0] = 0
        return g0[y0:y1, x0:x1].astype(np.float32), (x0, y0), tmask[y0:y1, x0:x1]

    @staticmethod
    def _refine(template, offset, tmask, gray, h):
        """ECC alignment of the current frame to the first one; keeps `h` when it fails or jumps."""
        shift = np.array([[1, 0, offset[0]], [0, 1, offset[1]], [0, 0, 1]], np.float64)
        warp = (h @ shift).astype(np.float32)
        warp /= warp[2, 2]
        criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 50, 1e-5)
        try:
            _, warp = cv2.findTransformECC(template, gray.astype(np.float32), warp,
                                           cv2.MOTION_HOMOGRAPHY, criteria, tmask, 3)
        except cv2.error:
            return h
        refined = warp.astype(np.float64) @ np.linalg.inv(shift)
        corners = np.array([[0, 0], [template.shape[1], 0], [template.shape[1], template.shape[0]], [0, template.shape[0]]]) + offset
        if np.max(np.linalg.norm(apply_h(refined, corners) - apply_h(h, corners), axis=1)) > 6:
            return h
        return refined


class MaskTracker:
    def track(self, masks):
        quads = []
        for m in masks:
            q = quad_from_mask(m)
            if q is None:
                q = quads[-1] if quads else None
            elif quads:
                q = align_quad(q, quads[-1])
            quads.append(q)
        first = next((q for q in quads if q is not None), None)
        if first is None:
            raise ValueError("surface never found in masks")
        return np.array([q if q is not None else first for q in quads])

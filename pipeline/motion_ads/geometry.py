"""Quads, homographies and smoothing of corner trajectories.

A quad is a (4, 2) float array ordered top-left, top-right, bottom-right, bottom-left.
"""

import cv2
import numpy as np
from scipy.signal import savgol_filter


def order_quad(pts):
    """Order 4 points as TL, TR, BR, BL (clockwise, starting top-left)."""
    pts = np.asarray(pts, dtype=np.float64).reshape(4, 2)
    c = pts.mean(axis=0)
    ang = np.arctan2(pts[:, 1] - c[1], pts[:, 0] - c[0])
    pts = pts[np.argsort(ang)]  # clockwise in image coordinates (y down)
    start = np.argmin(pts.sum(axis=1))
    return np.roll(pts, -start, axis=0)


def align_quad(quad, ref):
    """Cyclically shift `quad` so its corners best match `ref` (keeps labels stable over time)."""
    best = min(range(4), key=lambda k: np.linalg.norm(np.roll(quad, -k, axis=0) - ref))
    return np.roll(quad, -best, axis=0)


def quad_mask(quad, shape, erode=0):
    mask = np.zeros(shape[:2], np.uint8)
    cv2.fillConvexPoly(mask, np.round(quad).astype(np.int32), 255)
    if erode > 0:
        mask = cv2.erode(mask, np.ones((2 * erode + 1, 2 * erode + 1), np.uint8))
    return mask


def apply_h(h, pts):
    return cv2.perspectiveTransform(np.asarray(pts, np.float64).reshape(-1, 1, 2), h).reshape(-1, 2)


def quad_aspect(quad):
    """Approximate width / height of the physical surface seen through a quad."""
    w = (np.linalg.norm(quad[1] - quad[0]) + np.linalg.norm(quad[2] - quad[3])) / 2
    h = (np.linalg.norm(quad[3] - quad[0]) + np.linalg.norm(quad[2] - quad[1])) / 2
    return w / max(h, 1e-6)


def _intersect(l1, l2):
    (vx1, vy1, x1, y1), (vx2, vy2, x2, y2) = l1, l2
    a = np.array([[vx1, -vx2], [vy1, -vy2]])
    b = np.array([x2 - x1, y2 - y1])
    t = np.linalg.solve(a, b)[0]
    return np.array([x1 + t * vx1, y1 + t * vy1])


def quad_from_mask(mask):
    """Fit a quad to a binary mask of a planar surface, with sub-pixel corners.

    Rough corners come from a polygon approximation; each side is then refit with a
    robust line through the contour points along it, and corners are the intersections.
    Returns None when the mask has no usable region.
    """
    contours, _ = cv2.findContours((mask > 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    cnt = max(contours, key=cv2.contourArea)
    if cv2.contourArea(cnt) < 100:
        return None
    hull = cv2.convexHull(cnt)
    peri = cv2.arcLength(hull, True)
    rough = None
    for k in np.linspace(0.005, 0.1, 40):
        approx = cv2.approxPolyDP(hull, k * peri, True)
        if len(approx) == 4:
            rough = approx.reshape(4, 2)
            break
    if rough is None:
        rough = cv2.boxPoints(cv2.minAreaRect(cnt))
    rough = order_quad(rough)

    pts = cnt.reshape(-1, 2).astype(np.float64)
    lines = []
    for i in range(4):
        p, q = rough[i], rough[(i + 1) % 4]
        d = q - p
        length = np.linalg.norm(d)
        if length < 1:
            return rough
        u = d / length
        rel = pts - p
        along = rel @ u
        dist = np.abs(rel @ np.array([-u[1], u[0]]))
        keep = (dist < max(2.0, 0.02 * length)) & (along > 0.1 * length) & (along < 0.9 * length)
        if keep.sum() < 5:
            return rough
        lines.append(cv2.fitLine(pts[keep].astype(np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01).ravel())
    try:
        refined = np.array([_intersect(lines[i - 1], lines[i]) for i in range(4)])
    except np.linalg.LinAlgError:
        return rough
    if np.max(np.linalg.norm(refined - rough, axis=1)) > 0.1 * peri:
        return rough
    return refined


def smooth_quads(quads, window=9, poly=2):
    """Offline smoothing of corner trajectories (centered, so no lag)."""
    quads = np.asarray(quads, dtype=np.float64)
    n = len(quads)
    window = min(window, n if n % 2 else n - 1)
    if window <= poly + 1:
        return quads
    flat = quads.reshape(n, -1)
    return savgol_filter(flat, window, poly, axis=0).reshape(quads.shape)

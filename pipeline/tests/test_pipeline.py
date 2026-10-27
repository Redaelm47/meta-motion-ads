import numpy as np

from motion_ads.cli import place
from motion_ads.geometry import quad_from_mask, quad_mask
from motion_ads.synth import make_clip, make_texture
from motion_ads.tracking import FeatureTracker, MaskTracker


def test_feature_tracker_follows_handheld_camera():
    frames, gt, occs = make_clip(n=60)
    quads = FeatureTracker().track(frames, gt[0], occs)
    err = np.linalg.norm(quads - gt, axis=2)
    assert err.mean() < 1.0
    assert err.max() < 3.0


def test_quad_from_mask_is_subpixel():
    quad = np.array([[100.3, 80.7], [400.6, 95.2], [390.1, 330.8], [110.4, 300.5]])
    mask = quad_mask(quad, (480, 640))
    fit = quad_from_mask(mask)
    assert np.linalg.norm(fit - quad, axis=1).max() < 1.0


def test_mask_tracker_keeps_corner_order():
    _, gt, _ = make_clip(n=20)
    masks = [quad_mask(q, (540, 960)) for q in gt]
    quads = MaskTracker().track(masks)
    assert np.linalg.norm(quads - gt, axis=2).max() < 1.5


def test_place_keeps_occluder_in_front():
    frames, gt, occs = make_clip(n=50)
    out, _ = place(frames, make_texture(), gt[0], occluders=occs)
    t = 45
    occ = occs[t] > 0
    assert occ.any()
    diff = np.abs(out[t].astype(int) - frames[t].astype(int)).sum(axis=2)
    inner = np.zeros_like(occ)
    inner[2:-2, 2:-2] = occ[:-4, :-4] & occ[4:, 4:] & occ[:-4, 4:] & occ[4:, :-4]
    assert diff[inner].mean() < 3
    surface = (quad_mask(gt[t], frames[t].shape, erode=4) > 0) & ~occ
    assert diff[surface].mean() > 30

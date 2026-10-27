// Development stand-in for SAM 3.1: cuts out the subject under a point with Apple Vision.
// usage: swift cutout.swift <image> <x> <y> <out_rgba.png> <out_mask.png>
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count == 6, let x = Double(args[2]), let y = Double(args[3]) else {
    FileHandle.standardError.write("usage: cutout.swift <image> <x> <y> <out_rgba.png> <out_mask.png>\n".data(using: .utf8)!)
    exit(2)
}
let url = URL(fileURLWithPath: args[1])
guard let ci = CIImage(contentsOf: url) else { fatalError("cannot read \(args[1])") }
let w = ci.extent.width, h = ci.extent.height

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: ci)
try handler.perform([request])
guard let obs = request.results?.first else { fatalError("no subject found") }

// Instance label under the point (the label map is low resolution, origin top-left).
let labels = obs.instanceMask
CVPixelBufferLockBaseAddress(labels, .readOnly)
let lw = CVPixelBufferGetWidth(labels), lh = CVPixelBufferGetHeight(labels)
let row = CVPixelBufferGetBytesPerRow(labels)
let base = CVPixelBufferGetBaseAddress(labels)!.assumingMemoryBound(to: UInt8.self)
let px = min(lw - 1, max(0, Int(x / Double(w) * Double(lw))))
let py = min(lh - 1, max(0, Int(y / Double(h) * Double(lh))))
var label = Int(base[py * row + px])
if label == 0 {
    // Point fell just outside the subject: take the nearest labelled pixel.
    var best = Int.max
    for j in 0..<lh { for i in 0..<lw {
        let l = Int(base[j * row + i]); if l == 0 { continue }
        let d = (i - px) * (i - px) + (j - py) * (j - py)
        if d < best { best = d; label = l }
    } }
}
CVPixelBufferUnlockBaseAddress(labels, .readOnly)
guard label > 0 else { fatalError("no subject near the point") }

let instances = IndexSet(integer: label)
let maskBuf = try obs.generateScaledMaskForImage(forInstances: instances, from: handler)
let ctx = CIContext()

func writePNG(_ image: CIImage, _ path: String) {
    guard let cg = ctx.createCGImage(image, from: CGRect(x: 0, y: 0, width: w, height: h)) else { fatalError("render failed") }
    let rep = NSBitmapImageRep(cgImage: cg)
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}

let mask = CIImage(cvPixelBuffer: maskBuf)
let cut = ci.applyingFilter("CIBlendWithMask", parameters: [
    kCIInputBackgroundImageKey: CIImage(color: .clear).cropped(to: ci.extent),
    kCIInputMaskImageKey: mask,
])
writePNG(cut, args[4])
writePNG(mask, args[5])
print("instance \(label) of \(obs.allInstances.count)")

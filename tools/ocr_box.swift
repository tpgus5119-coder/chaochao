// 그림 속 글자 자리 — macOS Vision(기기 안, 무료). 쓰기: swift tools/ocr_box.swift 그림1 그림2 ...
// 한 줄에 하나: {"f": 경로, "w": 너비, "h": 높이, "b": [[글자, x, y, 너비, 높이], ...]}  (좌표는 픽셀, 왼쪽 위 기준)
// 쓰는 곳: tools/img_erase_word.py — 낱말 글자가 박힌 그림에서 그 글자만 지운다 (2026-09-28 밤)
import Foundation
import Vision
import ImageIO
for f in CommandLine.arguments.dropFirst() {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: f) as CFURL, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("{\"f\":\"\(f)\",\"err\":1}"); continue }
    let W = Double(img.width), H = Double(img.height)
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    req.recognitionLanguages = ["vi-VT", "en-US"]
    try? VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
    var boxes: [[Any]] = []
    for o in (req.results ?? []) {
        guard let c = o.topCandidates(1).first else { continue }
        let b = o.boundingBox
        boxes.append([c.string, b.minX * W, (1 - b.maxY) * H, b.width * W, b.height * H])
    }
    let j: [String: Any] = ["f": f, "w": W, "h": H, "b": boxes]
    if let d = try? JSONSerialization.data(withJSONObject: j), let s = String(data: d, encoding: .utf8) { print(s) }
}

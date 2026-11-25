# Membuat video palsu (y4m) berisi QR (dibuat OpenCV, bukan encoder app) untuk menguji scanner kamera.
import sys, cv2, numpy as np
text, out = sys.argv[1], sys.argv[2]
p = cv2.QRCodeEncoder_Params(); p.mode = cv2.QRCodeEncoder_MODE_BYTE; p.correction_level = cv2.QRCodeEncoder_CORRECT_LEVEL_M
qr = cv2.QRCodeEncoder.create(p).encode(text)
qr = cv2.resize(qr, None, fx=14, fy=14, interpolation=cv2.INTER_NEAREST)
W, H = 640, 480
canvas = np.full((H, W), 200, np.uint8)
y0, x0 = (H - qr.shape[0]) // 2, (W - qr.shape[1]) // 2
canvas[max(0,y0):max(0,y0)+qr.shape[0], max(0,x0):max(0,x0)+qr.shape[1]] = qr[:H, :W] if qr.shape[0] > H else qr
M = cv2.getRotationMatrix2D((W / 2, H / 2), 8, 0.9)
frame = cv2.warpAffine(canvas, M, (W, H), borderValue=200)
frame = cv2.GaussianBlur(frame, (3, 3), 0)
bgr = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
yuv = cv2.cvtColor(bgr, cv2.COLOR_BGR2YUV_I420)
with open(out, 'wb') as f:
    f.write(f'YUV4MPEG2 W{W} H{H} F10:1 Ip A1:1 C420jpeg\n'.encode())
    for _ in range(40): f.write(b'FRAME\n'); f.write(yuv.tobytes())

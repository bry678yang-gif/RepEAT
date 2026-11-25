import sys, cv2, numpy as np
img = np.zeros((900, 1200, 3), np.uint8); img[:] = (60, 140, 220)
cv2.circle(img, (600, 450), 300, (30, 200, 240), -1); cv2.putText(img, 'FOTO', (420, 500), cv2.FONT_HERSHEY_SIMPLEX, 4, (255,255,255), 8)
cv2.imwrite(sys.argv[1], img)

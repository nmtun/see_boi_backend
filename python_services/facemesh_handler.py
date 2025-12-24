import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2
import numpy as np

class FaceMeshHandler:
    def __init__(self, model_path='face_landmarker.task', num_faces=1):
        self.base_options = python.BaseOptions(model_asset_path=model_path)
        self.options = vision.FaceLandmarkerOptions(
            base_options=self.base_options,
            num_faces=num_faces
        )
        self.detector = vision.FaceLandmarker.create_from_options(self.options)

        self.landmark_map = {
            10:'hair',70:'brow_start_left',300:'brow_start_right',105:'brow_end_left',334:'brow_end_right',
            133:'eye_in_left',362:'eye_in_right',33:'eye_out_left',263:'eye_out_right',
            2:'nose_base',6:'nose_top',61:'mouth_left',291:'mouth_right',152:'chin',
            234:'ear_left',454:'ear_right',159:'nose_left',386:'nose_right',
            168:'gonion_left',197:'gonion_right'
        }

    def detect(self, image_input):
        if isinstance(image_input, str):
            img = cv2.imread(image_input)
            if img is None:
                raise ValueError("Không đọc được file ảnh")
        else:
            img = image_input

        h, w = img.shape[:2]
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

        result = self.detector.detect(mp_image)
        if not result.face_landmarks:
            return [], h, w

        face_landmarks = [face for face in result.face_landmarks]
        return face_landmarks, h, w

    def extract_landmarks(self, face_landmarks, h, w):
        landmarks = []
        for face in face_landmarks:
            # Glabella
            lm_left, lm_right = face[70], face[300]
            glabella = {
                'name':'glabella',
                'x': int((lm_left.x + lm_right.x)/2 * w),
                'y': int((lm_left.y + lm_right.y)/2 * h)
            }
            landmarks.append(glabella)

            # Chỉ các điểm trong landmark_map
            for idx, name in self.landmark_map.items():
                if idx >= len(face):
                    continue
                lm = face[idx]
                x, y = int(lm.x * w), int(lm.y * h)
                landmarks.append({'name': name, 'x': x, 'y': y})

        return landmarks


    def draw_landmarks(self, image: np.ndarray, landmarks, radius=3):
        """
        Chỉ hiển thị landmark đại diện cho:
        - Ngũ quan
        - Tam đình
        Không vẽ contour, không vẽ landmark tính toán
        """

        img = image.copy()

        # ===== helper =====
        def draw(x, y, r=radius):
            cv2.circle(
                img,
                (x, y),
                r,
                (255, 255, 255),
                -1,
                lineType=cv2.LINE_AA
            )

        # ===== map nhanh theo name =====
        lm = {p['name']: p for p in landmarks}

        # ========= TAM ĐÌNH =========
        for name in ['hair', 'glabella', 'nose_base', 'chin']:
            if name in lm:
                draw(lm[name]['x'], lm[name]['y'], r=5)

        # ========= MẮT (2 bên + trung tâm) =========
        eye_pairs = [
            ('eye_out_left', 'eye_in_left'),
            ('eye_in_right', 'eye_out_right')
        ]

        for left, right in eye_pairs:
            if left in lm and right in lm:
                # 2 đầu mắt
                draw(lm[left]['x'], lm[left]['y'])
                draw(lm[right]['x'], lm[right]['y'])

                # trung tâm mắt
                cx = int((lm[left]['x'] + lm[right]['x']) / 2)
                cy = int((lm[left]['y'] + lm[right]['y']) / 2)
                draw(cx, cy, r=3)

        # ========= CHÂN MÀY (1 ĐIỂM / BÊN) =========
        brow_groups = {
            'brow_left': ['brow_start_left', 'brow_end_left'],
            'brow_right': ['brow_start_right', 'brow_end_right']
        }

        for _, names in brow_groups.items():
            pts = [lm[n] for n in names if n in lm]
            if len(pts) == 2:
                x = int((pts[0]['x'] + pts[1]['x']) / 2)
                y = int((pts[0]['y'] + pts[1]['y']) / 2)
                draw(x, y, r=4)

        # ========= MŨI =========
        for name in ['nose_top', 'nose_left', 'nose_right', 'nose_base']:
            if name in lm:
                draw(lm[name]['x'], lm[name]['y'])

        # ========= MIỆNG =========
        for name in ['mouth_left', 'mouth_right']:
            if name in lm:
                draw(lm[name]['x'], lm[name]['y'])

        return img


    def draw_landmarks_from_bytes(self, image_bytes: bytes, landmarks=None, radius=3, color=(255,255,255)):
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Không thể đọc ảnh từ bytes")

        h, w = img.shape[:2]

        if landmarks is None:
            face_landmarks, _, _ = self.detect(img)
            if not face_landmarks:
                return img, image_bytes
            landmarks = self.extract_landmarks(face_landmarks, h, w)

        img_with_landmarks = self.draw_landmarks(img, landmarks, radius=radius)

        success, buffer = cv2.imencode('.png', img_with_landmarks)
        if not success:
            raise ValueError("Không thể encode ảnh sang bytes")

        img_bytes = buffer.tobytes()
        return img_with_landmarks, img_bytes

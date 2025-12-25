import math
from constants import TRAITS

class FaceAnalyzer:
    def __init__(self, landmarks):
        self.landmarks = {lm['name']: lm for lm in landmarks}

    def dist(self, p1_name, p2_name):
        if p1_name not in self.landmarks or p2_name not in self.landmarks: return 0
        p1, p2 = self.landmarks[p1_name], self.landmarks[p2_name]
        return math.sqrt((p2['x'] - p1['x'])**2 + (p2['y'] - p1['y'])**2)

    def _face_height(self): return self.dist('hair', 'chin')
    def R_upper(self): return self.dist('hair', 'glabella') / self._face_height() if self._face_height() > 0 else 0
    def R_middle(self): return self.dist('glabella', 'nose_base') / self._face_height() if self._face_height() > 0 else 0
    def R_lower(self): return self.dist('nose_base', 'chin') / self._face_height() if self._face_height() > 0 else 0
    
    def tam_dinh_diff(self):
        ratios = [self.R_upper(), self.R_middle(), self.R_lower()]
        return max(ratios) - min(ratios)

    def ESR(self):
        w = (self.dist('eye_in_left', 'eye_out_left') + self.dist('eye_in_right', 'eye_out_right')) / 2
        return self.dist('eye_in_left', 'eye_in_right') / w if w > 0 else 0

    def Angle_cantal(self):
        p_in, p_out = self.landmarks.get('eye_in_left'), self.landmarks.get('eye_out_left')
        if not p_in or not p_out: return 0
        return math.degrees(math.atan2(-(p_out['y'] - p_in['y']), p_out['x'] - p_in['x']))

    def R_nose_width(self):
        d_eyes = self.dist('eye_in_left', 'eye_in_right')
        return self.dist('nose_left', 'nose_right') / d_eyes if d_eyes > 0 else 0

    def nose_tip_ratio(self):
        return 'upturned' if self.landmarks.get('nose_top', {}).get('y', 0) < self.landmarks.get('nose_base', {}).get('y', 0) else 'downturned'

    def ear_position(self):
        y_ear = self.landmarks.get('ear_left', {}).get('y', 999)
        y_eye = self.landmarks.get('eye_out_left', {}).get('y', 0)
        return 'high' if y_ear < y_eye else 'low'

    def brow_width_ratio(self):
        w_brow = self.dist('brow_start_left', 'brow_end_left')
        w_eye = self.dist('eye_in_left', 'eye_out_left')
        return w_brow / w_eye if w_eye > 0 else 0

    def R_mouth_width(self):
        d_inter = self.dist('eye_in_left', 'eye_in_right')
        return self.dist('mouth_left', 'mouth_right') / (d_inter * 1.5) if d_inter > 0 else 0

    def Angle_jaw(self):
        a, b, c = 'ear_left', 'gonion_left', 'chin'
        if any(k not in self.landmarks for k in [a, b, c]): return 120 
        v1 = (self.landmarks[a]['x'] - self.landmarks[b]['x'], self.landmarks[a]['y'] - self.landmarks[b]['y'])
        v2 = (self.landmarks[c]['x'] - self.landmarks[b]['x'], self.landmarks[c]['y'] - self.landmarks[b]['y'])
        return abs(math.degrees(math.atan2(v2[1], v2[0]) - math.atan2(v1[1], v1[0])))

    def infer_all(self):
        results = {}
        for category, rules in TRAITS.items():
            results[category] = []
            
            has_match = False
            
            for rule in rules:
                key = rule.get('key')
                if not hasattr(self, key): continue
                
                value = getattr(self, key)()
                is_match = False
                
                if 'condition' in rule:
                    if value == rule['condition']: is_match = True
                elif 'threshold' in rule:
                    if key == 'tam_dinh_diff':
                        if value <= rule['threshold']: is_match = True
                    else:
                        if value >= rule['threshold']: is_match = True
                else:
                    lower = rule.get('min', float('-inf'))
                    upper = rule.get('max', float('inf'))
                    if lower <= value <= upper: is_match = True

                if is_match:
                    results[category].append({
                        'trait': rule['trait'],
                        'tags': rule.get('tags', [])
                    })
                    has_match = True

            if not has_match:
                results[category].append({
                    'trait': f"Đặc điểm {category} cân đối, ổn định (Trung tính)",
                    'tags': ['Neutral', 'Balanced']
                })
                    
        return results
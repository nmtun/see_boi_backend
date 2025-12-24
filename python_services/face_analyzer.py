import math
from constants import TRAITS

class FaceAnalyzer:
    def __init__(self, landmarks):
        self.landmarks = {lm['name']: lm for lm in landmarks}

    def dist(self, p1_name, p2_name):
        if p1_name not in self.landmarks or p2_name not in self.landmarks:
            return 0
        p1, p2 = self.landmarks[p1_name], self.landmarks[p2_name]
        return math.sqrt((p2['x'] - p1['x'])**2 + (p2['y'] - p1['y'])**2)

    def angle_3_points(self, a_name, b_name, c_name):
        """Tính góc tại điểm B tạo bởi A-B-C"""
        if any(k not in self.landmarks for k in [a_name, b_name, c_name]): return 0
        a, b, c = self.landmarks[a_name], self.landmarks[b_name], self.landmarks[c_name]
        v1 = (a['x'] - b['x'], a['y'] - b['y'])
        v2 = (c['x'] - b['x'], c['y'] - b['y'])
        rad = math.atan2(v2[1], v2[0]) - math.atan2(v1[1], v1[0])
        return abs(math.degrees(rad))

    def get_y(self, name):
        return self.landmarks[name]['y'] if name in self.landmarks else 0

    
    def _face_height(self): 
        return self.dist('hair', 'chin')

    def R_upper(self): 
        return self.dist('hair', 'glabella') / self._face_height()
    
    def R_middle(self): 
        return self.dist('glabella', 'nose_base') / self._face_height()
    
    def R_lower(self): 
        return self.dist('nose_base', 'chin') / self._face_height()

    def tam_dinh_diff(self):
        ratios = [self.R_upper(), self.R_middle(), self.R_lower()]
        return max(ratios) - min(ratios)

    def D_inter_canthal(self): 
        return self.dist('eye_in_left', 'eye_in_right')
    
    def W_eye_avg(self): 
        w_left = self.dist('eye_in_left', 'eye_out_left')
        w_right = self.dist('eye_in_right', 'eye_out_right')
        return (w_left + w_right) / 2

    def ESR(self): 
        width = self.W_eye_avg()
        return self.D_inter_canthal() / width if width > 0 else 0

    def Angle_cantal(self):
        p_in = self.landmarks.get('eye_in_left')
        p_out = self.landmarks.get('eye_out_left')
        if not p_in or not p_out: return 0
        
        dy = p_out['y'] - p_in['y']
        dx = p_out['x'] - p_in['x']
        angle = math.degrees(math.atan2(-dy, dx))
        return angle

    def R_nose_width(self):
        d_eyes = self.D_inter_canthal()
        return self.dist('nose_left', 'nose_right') / d_eyes if d_eyes > 0 else 0

    def nose_tip_ratio(self):
        y_tip = self.get_y('nose_tip')
        y_base = self.get_y('nose_base')
        
        if y_tip < y_base: 
            return 'upturned'
        return 'downturned'  

    def R_mouth_width(self):
        d_pupils = self.dist('pupil_left', 'pupil_right')
        base = d_pupils if d_pupils > 0 else self.D_inter_canthal() * 1.5
        return self.dist('mouth_left', 'mouth_right') / base if base > 0 else 0

    def Angle_jaw(self):
        return self.angle_3_points('ear_lobe_left', 'gonion_left', 'chin')

    def infer_all(self):
        results = {}
        
        for category, rules in TRAITS.items():
            results[category] = []
            
            for rule in rules:
                key = rule.get('key')
                if not key or not hasattr(self, key):
                    continue
                
                value = getattr(self, key)()
                
                is_match = False
                
                if 'condition' in rule:
                    if value == rule['condition']:
                        is_match = True
                
                elif 'threshold' in rule:
                    if key == 'tam_dinh_diff':
                        if value <= rule['threshold']: is_match = True
                    else:
                        if value >= rule['threshold']: is_match = True

                else:
                    lower_bound = rule.get('min', float('-inf'))
                    upper_bound = rule.get('max', float('inf'))
                    
                    if lower_bound <= value <= upper_bound:
                        is_match = True
                
                if is_match:
                    item = {
                        'trait': rule['trait'],
                        'tags': rule.get('tags', []) 
                    }
                    results[category].append(item)
                    
        return results
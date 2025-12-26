TRAITS = {
    'tam_dinh': [
        {'key': 'R_upper', 'min': 0.35, 'trait': 'Thượng đình cao rộng: Thông minh, được che chở tiền vận', 'tags': ['Intellectual', 'EarlySuccess']},
        {'key': 'R_middle', 'min': 0.35, 'trait': 'Trung đình nảy nở: Nghị lực, sự nghiệp trung vận vững vàng', 'tags': ['Determined', 'Career']},
        {'key': 'R_lower', 'min': 0.35, 'trait': 'Hạ đình đầy đặn: Hậu vận an nhàn, có của cải', 'tags': ['Stability', 'Wealth']},
        {'key': 'tam_dinh_diff', 'max': 0.03, 'trait': 'Tam đình cân xứng: Cuộc đời bình ổn, ít sóng gió', 'tags': ['Balanced']}
    ],
    'long_may': [ 
        {'key': 'brow_width_ratio', 'min': 1.1, 'trait': 'Lông mày dài quá mắt: Anh em hòa thuận, thọ trường', 'tags': ['Longevity', 'Family']},
    ],
    'mat': [
        {'key': 'ESR', 'min': 1.25, 'trait': 'Khoảng cách mắt rộng: Tư duy bao quát, phóng khoáng', 'tags': ['Visionary', 'Open']},
        {'key': 'ESR', 'max': 0.85, 'trait': 'Khoảng cách mắt hẹp: Cẩn thận, chi tiết, hay lo xa', 'tags': ['Detail-oriented']},
        {'key': 'Angle_cantal', 'min': 4, 'trait': 'Mắt xếch: Quyết liệt, có chí tiến thủ cao', 'tags': ['Ambitious']},
        {'key': 'Angle_cantal', 'max': -2, 'trait': 'Mắt xuôi: Hiền hậu, giàu cảm xúc, nội tâm', 'tags': ['Kind', 'Emotional']}
    ],
    'mui': [ 
        {'key': 'R_nose_width', 'min': 1.15, 'trait': 'Mũi lân (cánh mũi rộng): Giỏi tích lũy, vượng tài lộc', 'tags': ['Wealth', 'Business']},
        {'key': 'nose_tip_ratio', 'condition': 'upturned', 'trait': 'Mũi hếch: Hào sảng, khó giữ tiền mặt', 'tags': ['Generous']},
        {'key': 'nose_tip_ratio', 'condition': 'downturned', 'trait': 'Mũi dòm mồm: Khôn ngoan, giỏi tính toán chi phí', 'tags': ['Calculative']}
    ],
    'tai': [
        {'key': 'ear_position', 'condition': 'high', 'trait': 'Tai cao hơn mắt: Học nhanh, sớm có danh tiếng', 'tags': ['Smart', 'Fame']}
    ],
    'mieng_cam': [ 
        {'key': 'R_mouth_width', 'min': 1.05, 'trait': 'Miệng rộng: Quan hệ rộng, năng lực ngoại giao tốt', 'tags': ['Diplomatic', 'Social']},
        {'key': 'R_mouth_width', 'max': 0.85, 'trait': 'Miệng nhỏ: Thận trọng trong lời nói, kín kẽ', 'tags': ['Reserved']},
        {'key': 'Angle_jaw', 'max': 110, 'trait': 'Hàm vuông: Kiên định, chịu gian khổ tốt', 'tags': ['Resilient']}
    ],
    'an_duong': [
    {'key': 'an_duong_width', 'min': 0.08, 'trait': 'Ấn đường rộng rãi: Sự nghiệp hanh thông, tinh thần minh mẫn', 'tags': ['Career', 'Clarity']},
    {'key': 'an_duong_fullness', 'min': 0.5, 'trait': 'Ấn đường đầy đặn: Có quý nhân phù trợ, ít trở ngại', 'tags': ['Support', 'SmoothPath']},
    {'key': 'an_duong_scar', 'condition': False, 'trait': 'Không có sẹo: Tinh thần và sức khỏe tốt', 'tags': ['Healthy', 'Calm']},
    {'key': 'an_duong_mole', 'condition': False, 'trait': 'Không có nốt ruồi xấu: Đường công danh thuận lợi', 'tags': ['Fortunate']},
    {'key': 'an_duong_lines', 'max': 2, 'trait': 'Đường vân gọn gàng: Tư duy tích cực, ít trở ngại lớn', 'tags': ['PositiveMindset']}
    ]
}
TRAITS = {
    'tamdinh': [
        {
            'key': 'R_upper',
            'threshold': 0.35,
            'trait': 'Thượng đình thoáng đạt, trí tuệ phát triển sớm',
            'tags': ['EarlySuccess', 'Intellectual', 'Academic']
        },
        {
            'key': 'R_middle',
            'threshold': 0.35,
            'trait': 'Trung đình nở nang, ý chí và nghị lực mạnh',
            'tags': ['Ambition', 'CareerFocus', 'HighEnergy']
        },
        {
            'key': 'R_lower',
            'threshold': 0.35,
            'trait': 'Hạ đình đầy đặn, hậu vận an nhàn, thực tế',
            'tags': ['Practical', 'WealthAccumulation', 'FamilyOriented']
        },
        {
            'key': 'tam_dinh_diff',
            'threshold': 0.03,
            'trait': 'Tam đình cân xứng, cuộc đời bình ổn, ít sóng gió',
            'tags': ['BalancedLife', 'Peaceful', 'Stable']
        }
    ],

    'eyes': [
        {
            'key': 'ESR',
            'min': 1.25, 
            'trait': 'Khoảng cách mắt rộng: Phóng khoáng, nhìn xa, dễ tin người',
            'tags': ['BigPicture', 'EasyGoing', 'Visionary']
        },
        {
            'key': 'ESR',
            'max': 0.85, 
            'trait': 'Khoảng cách mắt hẹp: Tập trung chi tiết, kỹ tính, hay lo âu',
            'tags': ['DetailOriented', 'Anxious', 'Perfectionist']
        },
        {
            'key': 'Angle_cantal',
            'min': 4, 
            'trait': 'Mắt xếch: Quyết đoán, cá tính mạnh, thích chinh phục',
            'tags': ['Aggressive', 'Leader', 'StrongWilled']
        },
        {
            'key': 'Angle_cantal',
            'max': -2, 
            'trait': 'Mắt xuôi: Hiền lành, nội tâm, thiên về cảm xúc',
            'tags': ['Passive', 'Sentimental', 'Kind']
        }
    ],

    'nose': [
        {
            'key': 'R_nose_width',
            'min': 1.15, 
            'trait': 'Cánh mũi nảy nở (Mũi lân): Giỏi kinh doanh, tài lộc vượng',
            'tags': ['BusinessMinded', 'Wealthy', 'RiskTaker']
        },
        {
            'key': 'R_nose_width',
            'max': 0.85,
            'trait': 'Cánh mũi hẹp (Cô phong): Độc lập, khó giữ tiền, kỹ tính',
            'tags': ['Loner', 'Frugal', 'Individualistic']
        },
        {
            'key': 'nose_tip_ratio', 
            'condition': 'upturned', 
            'trait': 'Đầu mũi hếch (Lộ khổng): Hào phóng, khó giữ của',
            'tags': ['Generous', 'Spender', 'Open']
        },
        {
            'key': 'nose_tip_ratio',
            'condition': 'downturned',
            'trait': 'Đầu mũi dài che lỗ (Mũi dòm mồm): Giỏi tính toán, tiết kiệm',
            'tags': ['Calculative', 'Saver', 'Strategist']
        }
    ],

    'mouth': [
        {
            'key': 'R_mouth_width',
            'min': 1.05,
            'trait': 'Miệng rộng: Hướng ngoại, hoạt ngôn, tham vọng lãnh đạo',
            'tags': ['Extrovert', 'Leadership', 'Social']
        },
        {
            'key': 'R_mouth_width',
            'max': 0.85,
            'trait': 'Miệng nhỏ: Kín đáo, thận trọng, giữ bí mật tốt',
            'tags': ['Introvert', 'Secretive', 'Cautious']
        }
    ],

    'jaw': [
        {
            'key': 'Angle_jaw',
            'max': 110, 
            'trait': 'Hàm vuông (Chữ Điền): Kiên định, chịu khó, tố chất lãnh đạo thực chiến',
            'tags': ['StrongWill', 'Determined', 'Commander']
        },
        {
            'key': 'Angle_jaw',
            'min': 130, 
            'trait': 'Hàm thon gọn (V-line): Linh hoạt, thiên về nghệ thuật/giao tiếp',
            'tags': ['Flexible', 'Artistic', 'Adaptive']
        }
    ]
}
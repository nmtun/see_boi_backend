export interface FaceTrait {
  trait: string;
  tags: string[];
}

export interface FaceAnalysisReport {
  tam_dinh?: FaceTrait[];

  ngu_quan?: {
    long_may?: FaceTrait[];
    mat?: FaceTrait[];
    mui?: FaceTrait[];
    tai?: FaceTrait[];
    mieng_cam?: FaceTrait[];
  };

  an_duong?: FaceTrait[];
}

export interface PythonApiResponse {
  report: FaceAnalysisReport;
  visualized_image_base64: string;
  landmarks: any;
}

export interface DetailedInterpret {
  'tong-quan': string;

  tam_dinh: {
    thuong_dinh: string;
    trung_dinh: string;
    ha_dinh: string;
    tong_quan: string;
  };

  ngu_quan: {
    long_may: string;
    mat: string;
    mui: string;
    tai: string;
    mieng_cam: string;
  };

  an_duong: {
    mo_ta: string;
    y_nghia: string;
    danh_gia: string;
  };

  loi_khuyen: string[];
}

export interface PhysiognomyResponse {
  success: boolean;
  data: {
    fullName: string;
    birthDate: string; 
    gender: 'MALE' | 'FEMALE';

    report: FaceAnalysisReport;
    interpret?: DetailedInterpret;
    landmarks: any;
    image_base64: string;
    saved_id?: number;
  };
}

export const PHYSIOGNOMY_FALLBACK = {
  'tong-quan': 'Dựa trên phân tích khuôn mặt và thông tin cá nhân, đây là một mệnh cục có nhiều tiềm năng phát triển. Sự kết hợp giữa các đặc điểm nhân tướng học cho thấy một cuộc đời với nhiều cơ hội và thách thức, cần sự nỗ lực và kiên trì để đạt được thành công.',
  tam_dinh: {
    thuong: 'Vùng trán (Thượng đình) đại diện cho trí tuệ và sự khởi đầu.',
    trung: 'Vùng từ mày đến mũi (Trung đình) đại diện cho nghị lực và trung vận.',
    ha: 'Vùng cằm và miệng (Hạ đình) đại diện cho hậu vận và phúc đức.',
    tong_quan: 'Tam đình cân đối thể hiện cuộc đời ổn định.',
  },
  ngu_quan: {
    long_may: 'Lông mày thể hiện tình cảm và nhân duyên.',
    mat: 'Mắt thể hiện thần khí và trí tuệ.',
    mui: 'Mũi là cung tài bạch, đại diện tài vận.',
    tai: 'Tai thể hiện phúc thọ và trí tuệ sớm.',
    mieng_cam: 'Miệng và cằm thể hiện hậu vận và khả năng giao tiếp.',
  },
  an_duong: {
    mo_ta: 'Ấn đường nằm giữa hai lông mày, thuộc trung đình.',
    y_nghia: 'Phản ánh tinh thần, khí vận và sự thông suốt.',
    danh_gia: 'Sáng và rộng là dấu hiệu tốt.',
  },
};

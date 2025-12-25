export interface FaceTrait {
  trait: string;
  tags: string[];
}

export interface FaceAnalysisReport {
  tam_dinh?: FaceTrait[];
  long_may?: FaceTrait[]; 
  mat?: FaceTrait[];
  mui?: FaceTrait[];     
  tai?: FaceTrait[];     
  mieng_cam?: FaceTrait[]; 
}

export interface PythonApiResponse {
  report: FaceAnalysisReport;
  visualized_image_base64: string;
  landmarks: any;
}

export interface DetailedInterpret {
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
  loi_khuyen: string[];
}

export interface PhysiognomyResponse {
  success: boolean;
  data: {
    report: FaceAnalysisReport;
    interpret: DetailedInterpret; 
    landmarks: any;
    image_base64: string;
    saved_id?: number;
  };
}

export const PHYSIOGNOMY_FALLBACK = {
  tam_dinh: {
    thuong: "Vùng trán (Thượng đình) đại diện cho trí tuệ và sự khởi đầu.",
    trung: "Vùng từ mày đến mũi (Trung đình) đại diện cho nghị lực thân tự lập thân.",
    ha: "Vùng cằm và miệng (Hạ đình) đại diện cho thành quả và phúc đức hậu vận."
  },
  ngu_quan: {
    long_may: "Lông mày (Bảo thọ quan) thể hiện tình cảm anh em và thọ mệnh.",
    mat: "Mắt (Giám sát quan) thể hiện thần khí và sự tinh tường.",
    mui: "Mũi (Thẩm biện quan) là cung tài bạch, giữ tiền tài.",
    tai: "Tai (Thái thính quan) thể hiện sự thông tuệ và vận may sớm.",
    mieng_cam: "Miệng và Hàm thể hiện khả năng giao tiếp và sự kiên định."
  }
};
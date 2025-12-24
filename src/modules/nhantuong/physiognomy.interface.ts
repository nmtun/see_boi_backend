export interface FaceTrait {
  trait: string;
  tags: string[];
}

export interface FaceAnalysisReport {
  tamdinh?: FaceTrait[];
  eyes?: FaceTrait[];
  nose?: FaceTrait[];
  mouth?: FaceTrait[];
  jaw?: FaceTrait[];
}

export interface PythonApiResponse {
  report: FaceAnalysisReport;
  visualized_image_base64: string;
  metrics: any;
  landmarks: any;
}

export interface PhysiognomyResponse {
  success: boolean;
  data: {
    report: FaceAnalysisReport;
    metrics: any;
    landmarks: any;
    image_base64: string;
    saved_id?: number;
  };
}

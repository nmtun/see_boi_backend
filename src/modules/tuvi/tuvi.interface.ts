export enum THIEN_CAN {
  GIAP = "Giáp", AT = "Ất", BINH = "Bính", DINH = "Đinh", MAU = "Mậu",
  KY = "Kỷ", CANH = "Canh", TAN = "Tân", NHAM = "Nhâm", QUY = "Quý"
}

export enum DIA_CHI {
  TY = "Tý", SUU = "Sửu", DAN = "Dần", MAO = "Mão", THIN = "Thìn",
  TYI = "Tỵ", NGO = "Ngọ", MUI = "Mùi", THAN = "Thân", DAU = "Dậu",
  TUAT = "Tuất", HOI = "Hợi"
}

export enum CUNG_NAMES {
  MENH = "Mệnh", PHU_MAU = "Phụ mẫu", PHUC_DUC = "Phúc đức", DIEN_TRACH = "Điền trạch",
  QUAN_LOC = "Quan lộc", NO_BOC = "Nô bộc", THIEN_DI = "Thiên di", TAT_ACH = "Tật ách",
  TAI_BACH = "Tài bạch", TU_TUC = "Tử tức", PHU_THE = "Phu thê", HUYNH_DE = "Huynh đệ"
}

export const CUNG_NAMES_ARRAY: CUNG_NAMES[] = [
    CUNG_NAMES.MENH, CUNG_NAMES.PHU_MAU, CUNG_NAMES.PHUC_DUC, CUNG_NAMES.DIEN_TRACH,
    CUNG_NAMES.QUAN_LOC, CUNG_NAMES.NO_BOC, CUNG_NAMES.THIEN_DI, CUNG_NAMES.TAT_ACH,
    CUNG_NAMES.TAI_BACH, CUNG_NAMES.TU_TUC, CUNG_NAMES.PHU_THE, CUNG_NAMES.HUYNH_DE
];

export enum MAJOR_STARS {
  TU_VI = "Tử Vi", THIEN_PHU = "Thiên Phủ", THAI_DUONG = "Thái Dương", THAI_AM = "Thái Âm",
  LIEM_TRINH = "Liêm Trinh", VU_KHUC = "Vũ Khúc", CU_MON = "Cự Môn", PHA_QUAN = "Phá Quân",
  THAM_LANG = "Tham Lang", THIEN_CO = "Thiên Cơ", THIEN_LUONG = "Thiên Lương", THIEN_TUONG = "Thiên Tướng",
  THIEN_DONG = "Thiên Đồng", THAT_SAT = "Thất Sát"
}

export type CanChiElement = THIEN_CAN | DIA_CHI;
export type NguHanhElement = "Kim" | "Mộc" | "Thủy" | "Hỏa" | "Thổ" | "Khác";

export interface House {
  cung_name: CUNG_NAMES;
  branch: DIA_CHI;
  major_stars: MAJOR_STARS[];
  minor_stars: string[];
  analysis: string;
}

export interface TuViInput {
  birthDate: string;
  birthHour: number;
  gender: string;
  can: THIEN_CAN;
  chi: DIA_CHI;
  menh: NguHanhElement;
  birthPlace?: string;
  isLunar?: boolean;
}

export interface AspectScores {
  personality: number;
  career: number;
  love: number;
  wealth: number;
  health: number;
}

export interface TuViChart {
  input: TuViInput;
  houses: House[];
  aspects: AspectScores;
  interpretationAI: string | null; 
}

export const INTERP_TEMPLATES: { [key in CUNG_NAMES]?: string } = {
  [CUNG_NAMES.MENH]: "Mệnh: {stars}. Đây là lõi tính cách: {comment}",
  [CUNG_NAMES.PHU_MAU]: "Phụ mẫu: {stars}. Quan hệ gia đình, bố mẹ: {comment}",
  [CUNG_NAMES.PHUC_DUC]: "Phúc đức: {stars}. Về phúc phần, phúc thọ: {comment}",
  [CUNG_NAMES.DIEN_TRACH]: "Điền trạch: {stars}. Về nhà cửa, đất đai: {comment}",
  [CUNG_NAMES.QUAN_LOC]: "Quan lộc: {stars}. Về nghề nghiệp và danh vị: {comment}",
  [CUNG_NAMES.NO_BOC]: "Nô bộc: {stars}. Quan hệ bạn bè, cấp dưới: {comment}",
  [CUNG_NAMES.THIEN_DI]: "Thiên di: {stars}. Về đi xa, thay đổi nơi chốn: {comment}",
  [CUNG_NAMES.TAT_ACH]: "Tật ách: {stars}. Về sức khỏe, bệnh tật: {comment}",
  [CUNG_NAMES.TAI_BACH]: "Tài bạch: {stars}. Về tiền bạc, thu chi: {comment}",
  [CUNG_NAMES.TU_TUC]: "Tử tức: {stars}. Về con cái, hậu vận: {comment}",
  [CUNG_NAMES.PHU_THE]: "Phu thê: {stars}. Về tình cảm và hôn nhân: {comment}",
  [CUNG_NAMES.HUYNH_DE]: "Huynh đệ: {stars}. Về anh em, quan hệ thân thích: {comment}"
};

export const ASPECT_WEIGHTS: { [key in CUNG_NAMES]: [number, number, number, number, number] } = {
  [CUNG_NAMES.MENH]: [3, 0, 0, 0, 0],
  [CUNG_NAMES.PHU_MAU]: [1, 0, 0, 0, 1],
  [CUNG_NAMES.PHUC_DUC]: [2, 0, 0, 0, 1],
  [CUNG_NAMES.DIEN_TRACH]: [0, 0, 0, 1, 0],
  [CUNG_NAMES.QUAN_LOC]: [0, 3, 0, 1, 0],
  [CUNG_NAMES.NO_BOC]: [0, 1, 0, 0, 0],
  [CUNG_NAMES.THIEN_DI]: [1, 1, 1, 0, 0],
  [CUNG_NAMES.TAT_ACH]: [0, 0, 0, 0, 3],
  [CUNG_NAMES.TAI_BACH]: [0, 1, 0, 3, 0],
  [CUNG_NAMES.TU_TUC]: [0, 0, 1, 0, 0],
  [CUNG_NAMES.PHU_THE]: [0, 0, 2, 0, 0],
  [CUNG_NAMES.HUYNH_DE]: [0, 1, 0, 0, 0]
};

export const THIEN_CAN_ARRAY: THIEN_CAN[] = [
  THIEN_CAN.GIAP,
  THIEN_CAN.AT,
  THIEN_CAN.BINH,
  THIEN_CAN.DINH,
  THIEN_CAN.MAU,
  THIEN_CAN.KY,
  THIEN_CAN.CANH,
  THIEN_CAN.TAN,
  THIEN_CAN.NHAM,
  THIEN_CAN.QUY,
];

export const DIA_CHI_ARRAY: DIA_CHI[] = [
  DIA_CHI.TY,
  DIA_CHI.SUU,
  DIA_CHI.DAN,
  DIA_CHI.MAO,
  DIA_CHI.THIN,
  DIA_CHI.TYI,
  DIA_CHI.NGO,
  DIA_CHI.MUI,
  DIA_CHI.THAN,
  DIA_CHI.DAU,
  DIA_CHI.TUAT,
  DIA_CHI.HOI,
];

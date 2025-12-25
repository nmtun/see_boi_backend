export type THIEN_CAN =
  | 'Giáp' | 'Ất' | 'Bính' | 'Đinh' | 'Mậu'
  | 'Kỷ' | 'Canh' | 'Tân' | 'Nhâm' | 'Quý';

export type DIA_CHI =
  | 'Tý' | 'Sửu' | 'Dần' | 'Mão' | 'Thìn' | 'Tỵ'
  | 'Ngọ' | 'Mùi' | 'Thân' | 'Dậu' | 'Tuất' | 'Hợi';

export type NguHanhElement = 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';

export const THIEN_CAN_ARRAY: THIEN_CAN[] = [
  'Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'
];

export const DIA_CHI_ARRAY: DIA_CHI[] = [
  'Tý','Sửu','Dần','Mão','Thìn','Tỵ',
  'Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'
];

export const CUNG_NAMES_ARRAY = [
  'Mệnh','Huynh đệ','Phu thê','Tử tức','Tài bạch','Tật ách',
  'Thiên di','Nô bộc','Quan lộc','Điền trạch','Phúc đức','Phụ mẫu',
] as const;

export type CUNG_NAME = typeof CUNG_NAMES_ARRAY[number];

export const MAJOR_STARS = {
  TU_VI: 'Tử Vi',
  THIEN_CO: 'Thiên Cơ',
  THAI_DUONG: 'Thái Dương',
  VU_KHUC: 'Vũ Khúc',
  THIEN_DONG: 'Thiên Đồng',
  LIEM_TRINH: 'Liêm Trinh',
  THIEN_PHU: 'Thiên Phủ',
  THAI_AM: 'Thái Âm',
  THAM_LANG: 'Tham Lang',
  CU_MON: 'Cự Môn',
  THIEN_LUONG :'Thiên Lương',
  THIEN_TUONG: 'Thiên Tướng',
  THAT_SAT: 'Thất Sát',
  PHA_QUAN: 'Phá Quân',
} as const;

export type MAJOR_STARS = typeof MAJOR_STARS[keyof typeof MAJOR_STARS];

export interface House {
  cung_name: CUNG_NAME;
  branch: DIA_CHI;
  major_stars: MAJOR_STARS[];
  minor_stars: string[];
  analysis: string;
}

export interface AspectScores {
  personality: number;
  career: number;
  love: number;
  wealth: number;
  health: number;
}

export interface TuViInput {
  name?: string;
  birthDate: string;
  birthHour: number;
  gender: string;
  birthPlace?: string;
  isLunar: boolean;
  can: THIEN_CAN;
  chi: DIA_CHI;
  menh: NguHanhElement;
}

export interface TuViChart {
  input: TuViInput;
  houses: House[];
  aspects: AspectScores;
  interpretationAI: string | null;
}

export interface TuViChartResponse {
  chartId : number;
  output: TuViChart;
}

export const INTERP_TEMPLATES: Record<CUNG_NAME, string> = {
  Mệnh: 'Mệnh có {stars}: {comment}',
  'Huynh đệ': 'Huynh đệ có {stars}: {comment}',
  'Phu thê': 'Phu thê có {stars}: {comment}',
  'Tử tức': 'Tử tức có {stars}: {comment}',
  'Tài bạch': 'Tài bạch có {stars}: {comment}',
  'Tật ách': 'Tật ách có {stars}: {comment}',
  'Thiên di': 'Thiên di có {stars}: {comment}',
  'Nô bộc': 'Nô bộc có {stars}: {comment}',
  'Quan lộc': 'Quan lộc có {stars}: {comment}',
  'Điền trạch': 'Điền trạch có {stars}: {comment}',
  'Phúc đức': 'Phúc đức có {stars}: {comment}',
  'Phụ mẫu': 'Phụ mẫu có {stars}: {comment}',
};

export const ASPECT_WEIGHTS: Record<CUNG_NAME, [number, number, number, number, number]> = {
  Mệnh: [2, 1, 1, 1, 1],
  'Huynh đệ': [1, 0, 0, 0, 0],
  'Phu thê': [0, 0, 2, 0, 0],
  'Tử tức': [0, 0, 1, 0, 0],
  'Tài bạch': [0, 0, 0, 2, 0],
  'Tật ách': [0, 0, 0, 0, 2],
  'Thiên di': [1, 1, 0, 0, 0],
  'Nô bộc': [0, 1, 0, 0, 0],
  'Quan lộc': [0, 2, 0, 1, 0],
  'Điền trạch': [0, 0, 0, 1, 0],
  'Phúc đức': [1, 0, 1, 0, 0],
  'Phụ mẫu': [0, 0, 0, 0, 1],
};

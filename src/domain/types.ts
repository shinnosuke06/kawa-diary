// data.json の形（設計書 3.2）
export type Category = 'jacket' | 'shoes' | 'jeans' | 'hat' | 'other';
export type CareType = 'oil' | 'brushing' | 'wash' | 'waterproof' | 'repair' | 'other';

export interface DiaryData {
  version: 1;
  items: Item[];
}

export interface Item {
  id: string;
  name: string;
  brand: string;
  category: Category;
  purchaseDate: string | null;
  price: number | null;
  memo: string;
  photos: Photo[];
  care: CareRecord[];
  wearDates: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  takenAt: string;
  memo: string;
  fileId: string;
  thumbFileId: string;
  width: number;
  height: number;
}

export interface CareRecord {
  id: string;
  date: string;
  type: CareType;
  memo: string;
  photoId: string | null;
}

export interface ItemInput {
  name: string;
  brand: string;
  category: Category;
  purchaseDate: string | null;
  price: number | null;
  memo: string;
}

export interface PhotoMeta {
  takenAt: string;
  memo: string;
}

export interface CareInput {
  date: string;
  type: CareType;
  memo: string;
}

export const CATEGORIES: Category[] = ['jacket', 'shoes', 'jeans', 'hat', 'other'];
export const CATEGORY_LABELS: Record<Category, string> = {
  jacket: 'ジャケット',
  shoes: '靴',
  jeans: 'ジーンズ',
  hat: '帽子',
  other: 'その他',
};

export const CARE_TYPES: CareType[] = ['oil', 'brushing', 'wash', 'waterproof', 'repair', 'other'];
export const CARE_LABELS: Record<CareType, string> = {
  oil: 'オイル・クリーム',
  brushing: 'ブラッシング',
  wash: '洗濯',
  waterproof: '防水',
  repair: '修理',
  other: 'その他',
};

export interface Member {
  id: string;
  userId?: string;
  name: string;
  governorate: string;
  photoUrl?: string;
  canOffer: string;
  needs: string;
  contact: string;
  rating: number;
  ratingCount: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface Service {
  id: string;
  title: string;
  providerName: string;
  providerId?: string;
  governorate: string;
  price: string;
  description?: string;
  status: 'active' | 'hidden';
  createdAt: string;
}

export interface Order {
  id: string;
  serviceId: string;
  serviceTitle: string;
  providerId?: string;
  providerName?: string;
  requesterName: string;
  requesterContact: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
}

export const EGYPT_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الدقهلية',
  'الغربية',
  'الشرقية',
  'المنوفية',
  'القليوبية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'البحر الأحمر',
  'جنوب سيناء',
  'شمال سيناء',
  'مطروح',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'الوادي الجديد'
];

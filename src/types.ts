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
  plan?: 'free' | 'pro' | 'vip';
  planExpiresAt?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  title: string;
  providerName: string;
  providerId?: string;
  governorate: string;
  price: string;
  paymentMethod?: 'free' | 'cash' | 'vodafone_cash' | 'instapay';
  paymentDetails?: string; // e.g. Vodafone Cash mobile number or InstaPay address
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
  paymentMethod?: 'free' | 'cash' | 'vodafone_cash' | 'instapay';
  paymentSenderInfo?: string; // e.g. Phone number sent from or transfer ref
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
}

export interface SubscriptionPlan {
  id: 'free' | 'pro' | 'vip';
  name: string;
  badge: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  maxServices: number;
  featured: boolean;
  color: string;
}

export interface SubscriptionRequest {
  id: string;
  memberId: string;
  memberName: string;
  memberContact: string;
  plan: 'pro' | 'vip';
  planId?: 'pro' | 'vip';
  planName?: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  currency?: string;
  paymentMethod: 'vodafone_cash' | 'instapay';
  paymentSenderInfo: string;
  transactionRef?: string;
  referenceCode?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
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

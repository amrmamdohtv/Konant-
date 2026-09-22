import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member, Service, Order } from '../types';

const MEMBERS_COLLECTION = 'members';
const SERVICES_COLLECTION = 'services';
const ORDERS_COLLECTION = 'orders';

// Initial seed data from user examples
const INITIAL_MEMBERS: Omit<Member, 'id'>[] = [
  {
    name: 'كريم المنشاوي',
    governorate: 'القاهرة',
    photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    canOffer: 'صديق ليوم، جولات تصوير شوارع، ومرافق فعاليات ومعارض فنية',
    needs: 'شريك لتعلم لغات برمجة، وتجارب تخييم في الصحراء',
    contact: 'karim.lens@example.com / 01012345678',
    rating: 4.9,
    ratingCount: 14,
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'سارة عبد الرحمن',
    governorate: 'الجيزة',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    canOffer: 'سكرتيرة ليوم، تنظيم مواعيد وجداول، مساعدة في إنجاز المهام المكتبية',
    needs: 'شريكة رياضة جري صباحي في زايد، وشريكة ألعاب لوحية',
    contact: 'sara.organize@example.com / 01198765432',
    rating: 5.0,
    ratingCount: 19,
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'عمر شريف',
    governorate: 'الإسكندرية',
    photoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    canOffer: 'شريك ألعاب (PlayStation / PC)، وتحديات شطرنج',
    needs: 'مرافق لخروجات استكشاف مطاعم ومقاهي جديدة في الإسكندرية',
    contact: 'omar.gaming@example.com / 01234567890',
    rating: 4.8,
    ratingCount: 9,
    status: 'active',
    createdAt: new Date().toISOString(),
  }
];

const INITIAL_SERVICES: Omit<Service, 'id'>[] = [
  {
    title: 'صديق ليوم وتجربة استكشاف وسط البلد',
    providerName: 'كريم المنشاوي',
    governorate: 'القاهرة',
    price: 'مجانًا',
    description: 'قضاء يوم كامل في استكشاف المقاهي القديمة والمكتبات والحديث عن الثقافة والتاريخ.',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'سكرتيرة ومساعدة شخصية ليوم كامل',
    providerName: 'سارة عبد الرحمن',
    governorate: 'الجيزة',
    price: '150 ج.م',
    description: 'تنظيم إيميلات، ترتيب ملفات، حجز مواعيد ومرافقة لاجتماعات العمل لتنظيم اليوم.',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'شريك ألعاب وبطولات فيفا وتنافس أونلاين',
    providerName: 'عمر شريف',
    governorate: 'الإسكندرية',
    price: 'مجانًا',
    description: 'جلسة ألعاب ممتعة وتحديات تنافسية مع تجربة مرحة وشرح أسرار الألعاب.',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'شريك رياضة وتمارين لياقة بدنية',
    providerName: 'طارق حسام',
    governorate: 'القاهرة',
    price: 'مجانًا',
    description: 'التحفيز على أداء التمارين في الجيم أو الجري المفتوح ومتابعة جدول التدريب.',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'مرافق لفعالية أو حفل موسيقي',
    providerName: 'نور الدين',
    governorate: 'الجيزة',
    price: 'مجانًا',
    description: 'إذا كان لديك تذكرة إضافية أو لا ترغب بالذهاب بمفردك، أرافقك ونستمتع بالأجواء معًا.',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'جلسة تصوير احترافية لشخص أو منتج',
    providerName: 'كريم المنشاوي',
    governorate: 'القاهرة',
    price: '200 ج.م',
    description: 'تصوير احترافي لمدة ساعتين مع تعديل أفضل 15 صورة بجودة عالية.',
    status: 'active',
    createdAt: new Date().toISOString(),
  }
];

export async function seedInitialDataIfEmpty() {
  try {
    const servicesSnap = await getDocs(collection(db, SERVICES_COLLECTION));
    if (servicesSnap.empty) {
      // Seed services
      for (const service of INITIAL_SERVICES) {
        await addDoc(collection(db, SERVICES_COLLECTION), service);
      }
      // Seed members
      for (const member of INITIAL_MEMBERS) {
        await addDoc(collection(db, MEMBERS_COLLECTION), member);
      }
      console.log('Initial community data seeded successfully.');
    }
  } catch (error) {
    console.warn('Could not seed initial data:', error);
  }
}

// MEMBERS
export async function getMembers(): Promise<Member[]> {
  try {
    const snap = await getDocs(collection(db, MEMBERS_COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MEMBERS_COLLECTION);
    return [];
  }
}

export async function registerMember(data: Omit<Member, 'id' | 'rating' | 'ratingCount' | 'status' | 'createdAt'>): Promise<string> {
  const path = MEMBERS_COLLECTION;
  try {
    const newMember = {
      ...data,
      rating: 5.0,
      ratingCount: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, path), newMember);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function updateMemberStatus(id: string, status: 'active' | 'suspended') {
  const path = `${MEMBERS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, MEMBERS_COLLECTION, id);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// SERVICES
export async function getServices(): Promise<Service[]> {
  try {
    const snap = await getDocs(collection(db, SERVICES_COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Service));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, SERVICES_COLLECTION);
    return [];
  }
}

export async function addService(data: Omit<Service, 'id' | 'status' | 'createdAt'>): Promise<string> {
  const path = SERVICES_COLLECTION;
  try {
    const newService = {
      ...data,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, path), newService);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function updateService(id: string, data: Partial<Service>) {
  const path = `${SERVICES_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, SERVICES_COLLECTION, id);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteService(id: string) {
  const path = `${SERVICES_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, SERVICES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ORDERS
export async function getOrders(): Promise<Order[]> {
  try {
    const snap = await getDocs(collection(db, ORDERS_COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, ORDERS_COLLECTION);
    return [];
  }
}

export async function createOrder(data: Omit<Order, 'id' | 'status' | 'createdAt'>): Promise<string> {
  const path = ORDERS_COLLECTION;
  try {
    const newOrder = {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, path), newOrder);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function updateOrderStatus(id: string, status: Order['status']) {
  const path = `${ORDERS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, ORDERS_COLLECTION, id);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

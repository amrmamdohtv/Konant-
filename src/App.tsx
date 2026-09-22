import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  User, 
  UserPlus, 
  ShieldCheck, 
  MapPin, 
  Star, 
  Plus, 
  Trash2, 
  Edit3, 
  Send, 
  X, 
  Check, 
  AlertTriangle,
  Phone,
  Search,
  Flame,
  Layers,
  Lock,
  Compass,
  ArrowUpRight,
  LogIn,
  LogOut,
  KeyRound,
  Smartphone,
  Zap,
  Coins,
  CheckCircle2,
  Clock,
  Wallet,
  Crown,
  CreditCard,
  Sparkles,
  Award
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { Member, Service, Order, SubscriptionPlan, SubscriptionRequest, EGYPT_GOVERNORATES } from './types';
import { 
  getMembers, 
  getServices, 
  getOrders, 
  getSubscriptions,
  registerMember, 
  updateMemberStatus, 
  addService, 
  updateService, 
  deleteService, 
  createOrder, 
  updateOrderStatus,
  createSubscriptionRequest,
  updateSubscriptionStatus,
  updateMemberPlan,
  seedInitialDataIfEmpty 
} from './services/db';
import { PricingSection } from './components/PricingSection';
import { SubscriptionModal } from './components/SubscriptionModal';
import { SUBSCRIPTION_PLANS, PLATFORM_PAYMENT_INFO } from './data/plans';

const ADMIN_EMAIL = 'amrmamdoh22687@gmail.com';
const ADMIN_PASSWORD = 'admin123'; // Default secure password for platform manager

// View Tabs
type ViewMode = 'home' | 'services' | 'pricing' | 'register' | 'profile' | 'admin';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [customUserSession, setCustomUserSession] = useState<{ name: string; email: string } | null>(null);

  // Unified Clean Login Modal State (Completely hides admin credentials)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Data states
  const [members, setMembers] = useState<Member[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Subscription Checkout Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalPlan, setSubModalPlan] = useState<SubscriptionPlan | null>(null);
  const [subModalCycle, setSubModalCycle] = useState<'monthly' | 'annual'>('monthly');

  // Admin Active Tab
  const [adminActiveTab, setAdminActiveTab] = useState<'orders' | 'subscriptions' | 'services' | 'members'>('orders');

  // Filter & Search for Services
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [orderModalService, setOrderModalService] = useState<Service | null>(null);
  const [orderForm, setOrderForm] = useState({ 
    name: '', 
    contact: '', 
    notes: '',
    paymentMethod: 'cash' as 'free' | 'cash' | 'vodafone_cash' | 'instapay',
    paymentSenderInfo: '',
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Service Edit/Add Modal (Admin or Provider)
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    title: '',
    providerName: '',
    governorate: 'القاهرة',
    price: 'مجانًا',
    paymentMethod: 'free' as 'free' | 'cash' | 'vodafone_cash' | 'instapay',
    paymentDetails: '',
    description: '',
  });

  // Member Registration Form
  const [regForm, setRegForm] = useState({
    name: '',
    governorate: 'القاهرة',
    photoUrl: '',
    canOffer: '',
    needs: '',
    contact: '',
  });
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Toast notification helper
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setIsAdminUnlocked(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial data & seed if necessary
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await seedInitialDataIfEmpty();
      const [fetchedMembers, fetchedServices, fetchedOrders, fetchedSubs] = await Promise.all([
        getMembers(),
        getServices(),
        getOrders(),
        getSubscriptions(),
      ]);
      setMembers(fetchedMembers);
      setServices(fetchedServices);
      setOrders(fetchedOrders);
      setSubscriptions(fetchedSubs);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered services with Pro and VIP priority sorting
  const visibleServices = useMemo(() => {
    const list = services.filter((s) => {
      const matchGov = selectedGovernorate === 'الكل' || s.governorate === selectedGovernorate;
      const matchSearch = 
        searchQuery === '' || 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.providerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchActive = s.status === 'active' || isAdminUnlocked;
      return matchGov && matchSearch && matchActive;
    });

    // Sort VIP and Pro providers first
    return list.sort((a, b) => {
      const aMember = members.find(m => m.name.toLowerCase() === a.providerName.toLowerCase() || (a.providerId && m.userId === a.providerId));
      const bMember = members.find(m => m.name.toLowerCase() === b.providerName.toLowerCase() || (b.providerId && m.userId === b.providerId));
      const getScore = (m?: Member) => {
        if (m?.plan === 'vip') return 3;
        if (m?.plan === 'pro') return 2;
        return 1;
      };
      return getScore(bMember) - getScore(aMember);
    });
  }, [services, selectedGovernorate, searchQuery, isAdminUnlocked, members]);

  // Logged-in user's personal member profile
  const loggedInMember = useMemo(() => {
    if (currentUser) {
      const byUid = members.find((m) => m.userId === currentUser.uid);
      if (byUid) return byUid;
      if (currentUser.email) {
        const byEmail = members.find((m) => m.contact.toLowerCase().includes(currentUser.email!.toLowerCase()));
        if (byEmail) return byEmail;
      }
      if (currentUser.displayName) {
        const byName = members.find((m) => m.name.toLowerCase() === currentUser.displayName!.toLowerCase());
        if (byName) return byName;
      }
    }
    if (customUserSession) {
      if (customUserSession.email) {
        const byEmail = members.find((m) => m.contact.toLowerCase().includes(customUserSession.email.toLowerCase()));
        if (byEmail) return byEmail;
      }
      const byName = members.find((m) => m.name.toLowerCase() === customUserSession.name.toLowerCase());
      if (byName) return byName;
    }
    return null;
  }, [currentUser, customUserSession, members]);

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      notify(`مرحباً ${res.user.displayName || ''}`);
      if (res.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setIsAdminUnlocked(true);
      }
      setIsLoginModalOpen(false);
      setLoginError(null);
    } catch (err) {
      console.error('Sign-in error:', err);
      notify('تعذر تسجيل الدخول بـ Google، يمكنك الدخول باسمك أو بريدك');
    }
  };

  // Unified Clean Login (Admin check is completely secret and invisible to the public)
  const handleUnifiedLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setLoginError('يرجى إدخال البريد الإلكتروني أو اسم المستخدم');
      return;
    }

    // Secret Admin Authentication (No admin details shown anywhere in UI)
    if (identifier.toLowerCase() === ADMIN_EMAIL.toLowerCase() && loginPassword === ADMIN_PASSWORD) {
      setIsAdminUnlocked(true);
      setCustomUserSession({ name: 'المدير المسؤول', email: ADMIN_EMAIL });
      setIsLoginModalOpen(false);
      setLoginIdentifier('');
      setLoginPassword('');
      notify('تم تسجيل الدخول بنجاح كمسؤول للمنصة');
      setCurrentView('admin');
      return;
    }

    // Regular Member Login
    const memberName = identifier.includes('@') ? identifier.split('@')[0] : identifier;
    setCustomUserSession({ 
      name: memberName, 
      email: identifier.includes('@') ? identifier : '' 
    });
    setIsAdminUnlocked(false);
    setIsLoginModalOpen(false);
    setLoginIdentifier('');
    setLoginPassword('');
    notify(`مرحباً بك يا ${memberName}! يمكنك الآن إدارة ملفك وطلب الخدمات.`);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsAdminUnlocked(false);
    setCustomUserSession(null);
    if (currentView === 'admin') {
      setCurrentView('home');
    }
    notify('تم تسجيل الخروج بنجاح');
  };

  // Submit new member
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.contact || !regForm.canOffer || !regForm.needs) {
      notify('يرجى ملء كافة الحقول الأساسية المطلوبة');
      return;
    }

    setIsSubmittingMember(true);
    try {
      const newId = await registerMember({
        userId: currentUser?.uid || undefined,
        name: regForm.name.trim(),
        governorate: regForm.governorate,
        photoUrl: regForm.photoUrl.trim() || undefined,
        canOffer: regForm.canOffer.trim(),
        needs: regForm.needs.trim(),
        contact: regForm.contact.trim(),
      });

      // Reload members
      const updated = await getMembers();
      setMembers(updated);
      notify('تم تسجيل عضويتك بنجاح في مجتمع رفيق!');
      setRegForm({
        name: '',
        governorate: 'القاهرة',
        photoUrl: '',
        canOffer: '',
        needs: '',
        contact: '',
      });
      setCurrentView('profile');
    } catch (err) {
      console.error(err);
      notify('حدث خطأ أثناء التسجيل');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  // Order submit
  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderModalService) return;
    if (!orderForm.name || !orderForm.contact) {
      notify('يرجى كتابة الاسم ووسيلة التواصل');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      await createOrder({
        serviceId: orderModalService.id,
        serviceTitle: orderModalService.title,
        providerId: orderModalService.providerId,
        providerName: orderModalService.providerName,
        requesterName: orderForm.name.trim(),
        requesterContact: orderForm.contact.trim(),
        paymentMethod: orderForm.paymentMethod,
        paymentSenderInfo: orderForm.paymentSenderInfo.trim() || undefined,
        notes: orderForm.notes.trim() || undefined,
      });

      const updatedOrders = await getOrders();
      setOrders(updatedOrders);
      setOrderModalService(null);
      setOrderForm({ 
        name: '', 
        contact: '', 
        notes: '', 
        paymentMethod: 'cash', 
        paymentSenderInfo: '' 
      });
      notify('تم إرسال طلبك بنجاح لمقدم الخدمة!');
    } catch (err) {
      console.error(err);
      notify('فشل إرسال الطلب');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Admin Actions
  const handleToggleMemberStatus = async (member: Member) => {
    const nextStatus = member.status === 'active' ? 'suspended' : 'active';
    await updateMemberStatus(member.id, nextStatus);
    const updated = await getMembers();
    setMembers(updated);
    notify(nextStatus === 'suspended' ? 'تم إيقاف العضو' : 'تم تفعيل العضو');
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.title || !serviceForm.providerName) {
      notify('يرجى ملء اسم الخدمة ومقدم الخدمة');
      return;
    }

    if (editingService) {
      await updateService(editingService.id, {
        title: serviceForm.title,
        providerName: serviceForm.providerName,
        governorate: serviceForm.governorate,
        price: serviceForm.price,
        paymentMethod: serviceForm.paymentMethod,
        paymentDetails: serviceForm.paymentDetails.trim() || undefined,
        description: serviceForm.description,
      });
      notify('تم تحديث الخدمة بنجاح');
    } else {
      await addService({
        title: serviceForm.title,
        providerName: serviceForm.providerName,
        providerId: currentUser?.uid,
        governorate: serviceForm.governorate,
        price: serviceForm.price,
        paymentMethod: serviceForm.paymentMethod,
        paymentDetails: serviceForm.paymentDetails.trim() || undefined,
        description: serviceForm.description,
      });
      notify('تمت إضافة الخدمة بنجاح');
    }

    const updated = await getServices();
    setServices(updated);
    setIsServiceModalOpen(false);
    setEditingService(null);
    setServiceForm({ 
      title: '', 
      providerName: '', 
      governorate: 'القاهرة', 
      price: 'مجانًا', 
      paymentMethod: 'free', 
      paymentDetails: '', 
      description: '' 
    });
  };

  const handleDeleteService = async (serviceId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
      await deleteService(serviceId);
      const updated = await getServices();
      setServices(updated);
      notify('تم حذف الخدمة');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    await updateOrderStatus(orderId, status);
    const updated = await getOrders();
    setOrders(updated);
    notify('تم تحديث حالة الطلب');
  };

  // Subscription Handlers
  const handleOpenSubscriptionCheckout = (plan: SubscriptionPlan, cycle: 'monthly' | 'annual') => {
    setSubModalPlan(plan);
    setSubModalCycle(cycle);
    setIsSubModalOpen(true);
  };

  const handleSubmitSubscription = async (payload: {
    plan: 'pro' | 'vip';
    billingCycle: 'monthly' | 'annual';
    amount: number;
    paymentMethod: 'vodafone_cash' | 'instapay';
    paymentSenderInfo: string;
    transactionRef: string;
  }) => {
    if (!loggedInMember) {
      notify('يرجى تسجيل بطاقة عضويتك في المجتمع أولاً لإتمام الاشتراك');
      setCurrentView('register');
      return;
    }

    await createSubscriptionRequest({
      memberId: loggedInMember.id,
      memberName: loggedInMember.name,
      memberContact: loggedInMember.contact,
      plan: payload.plan,
      billingCycle: payload.billingCycle,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      paymentSenderInfo: payload.paymentSenderInfo,
      transactionRef: payload.transactionRef || undefined,
    });

    const updatedSubs = await getSubscriptions();
    setSubscriptions(updatedSubs);
    notify('تم استلام طلب اشتراكك بنجاح! سيتم مراجعة التحويل وتفعيل الباقة فوراً.');
  };

  const handleReviewSubscription = async (
    sub: SubscriptionRequest,
    status: 'approved' | 'rejected'
  ) => {
    await updateSubscriptionStatus(
      sub.id,
      status,
      sub.memberId,
      sub.plan,
      sub.billingCycle
    );

    const [updatedSubs, updatedMembers] = await Promise.all([
      getSubscriptions(),
      getMembers(),
    ]);
    setSubscriptions(updatedSubs);
    setMembers(updatedMembers);
    notify(status === 'approved' ? `تم تفعيل باقة ${sub.plan.toUpperCase()} للعضو بنجاح!` : 'تم رفض طلب الاشتراك');
  };

  const handleAdminChangeMemberPlan = async (memberId: string, plan: 'free' | 'pro' | 'vip') => {
    await updateMemberPlan(memberId, plan);
    const updated = await getMembers();
    setMembers(updated);
    notify(`تم تعديل باقة العضو إلى: ${plan.toUpperCase()}`);
  };

  // Check service limits based on current member's plan
  const checkCanAddService = (): boolean => {
    if (isAdminUnlocked) return true;
    if (!loggedInMember) return true;

    const userServicesCount = services.filter(
      (s) => s.providerName.toLowerCase() === loggedInMember.name.toLowerCase() || (s.providerId && s.providerId === currentUser?.uid)
    ).length;

    const memberPlan = loggedInMember.plan || 'free';
    const planConfig = SUBSCRIPTION_PLANS.find((p) => p.id === memberPlan);
    const maxLimit = planConfig?.maxServices || 2;

    if (userServicesCount >= maxLimit) {
      notify(`لقد وصلت للحد الأقصى لخطة (${planConfig?.name || 'الأساسية'}). قم بترقية اشتراكك لنشر المزيد!`);
      setCurrentView('pricing');
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div 
          id="toast-notification"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#161926] border border-purple-500/50 text-white px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm flex items-center gap-2 animate-bounce"
        >
          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0c0d14]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button 
            id="nav-logo"
            onClick={() => setCurrentView('home')} 
            className="flex items-center gap-2 text-right group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-700 to-zinc-900 border border-purple-500/40 flex items-center justify-center text-purple-200 shadow-[0_0_10px_rgba(147,51,234,0.3)] group-hover:border-purple-400 transition-colors">
              <Compass className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white block">رفيق</span>
              <span className="text-[10px] text-zinc-500 -mt-1 block cinzel-font tracking-wider">COMMUNITY PLATFORM</span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
            <button
              id="desktop-nav-home"
              onClick={() => setCurrentView('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'home' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              الرئيسية
            </button>
            <button
              id="desktop-nav-services"
              onClick={() => setCurrentView('services')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'services' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              الخدمات والتجارب
            </button>
            <button
              id="desktop-nav-pricing"
              onClick={() => setCurrentView('pricing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentView === 'pricing' ? 'bg-amber-950/70 text-amber-300 border border-amber-500/50 shadow-sm' : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-950/30'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>الاشتراكات والأسعار</span>
            </button>
            <button
              id="desktop-nav-register"
              onClick={() => setCurrentView('register')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'register' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              تسجيل عضو
            </button>
            <button
              id="desktop-nav-profile"
              onClick={() => setCurrentView('profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'profile' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              الملف الشخصي
            </button>

            {/* Admin Tab - ONLY visible if Admin is unlocked */}
            {isAdminUnlocked && (
              <button
                id="desktop-nav-admin"
                onClick={() => setCurrentView('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  currentView === 'admin' 
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]' 
                    : 'text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/40'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>لوحة الأدمن</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              </button>
            )}
          </nav>

          {/* User Auth Info & Login/Logout Controls */}
          <div className="flex items-center gap-2">
            {currentUser || customUserSession || isAdminUnlocked ? (
              <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-full py-1 px-3 shadow-inner">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isAdminUnlocked ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-purple-400'}`}></span>
                  <span className="text-xs font-bold text-zinc-200 max-w-[110px] truncate">
                    {isAdminUnlocked 
                      ? 'المدير' 
                      : (customUserSession?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'عضو')}
                  </span>
                </div>
                <button
                  id="btn-signout"
                  onClick={handleSignOut}
                  title="تسجيل الخروج"
                  className="text-zinc-500 hover:text-rose-400 text-xs transition-colors border-r border-zinc-800 pr-2 mr-1 flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <button
                id="btn-open-login-modal"
                onClick={() => {
                  setLoginError(null);
                  setIsLoginModalOpen(true);
                }}
                className="text-xs text-white bg-purple-600 hover:bg-purple-500 border border-purple-500/50 rounded-xl px-3 py-1.5 font-bold transition-all shadow-[0_0_12px_rgba(147,51,234,0.35)] flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 pb-24 md:pb-8">
        {/* =========================================================================
            1. الصفحة الرئيسية (HOME)
           ========================================================================= */}
        {currentView === 'home' && (
          <div id="view-home" className="space-y-8 pt-4">
            {/* Hero Section */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#131522] to-[#0d0f17] border border-zinc-800/90 p-6 md:p-12 text-center shadow-xl">
              {/* Subtle gothic glow effect */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 max-w-2xl mx-auto space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-700/40 text-purple-300 text-xs font-mono">
                  <Flame className="w-3.5 h-3.5 text-purple-400" />
                  <span>شبكة تبادل التجارب والخدمات المجتمعية</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  مجتمع رفيق
                </h1>

                {/* Mandated phrase from prompt */}
                <p className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-zinc-100 to-purple-300">
                  "عندك حاجة؟ شاركها. محتاج حاجة؟ اطلبها."
                </p>

                <p className="text-sm md:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed">
                  منصة تجمع أعضاء المجتمع لمشاركة التجارب الشخصية، الأنشطة، والخدمات المتبادلة بكل بساطة ومباشرة.
                </p>

                {/* Mandated CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    id="btn-hero-order-service"
                    onClick={() => setCurrentView('services')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center gap-2"
                  >
                    <span>أطلب خدمة</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  <button
                    id="btn-hero-offer-service"
                    onClick={() => setCurrentView('register')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>أقدم خدمة</span>
                    <Plus className="w-4 h-4 text-purple-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Examples Grid as highlighted in prompt */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>تجارب وخدمات مقترحة بين الأعضاء</span>
                </h2>
                <button
                  onClick={() => setCurrentView('services')}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  استعراض الكل ({services.length})
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[
                  { title: 'صديق ليوم', desc: 'استكشاف وحوارات ملهمة' },
                  { title: 'سكرتير ليوم', desc: 'تنظيم مهام وجدول مواعيد' },
                  { title: 'شريك خروجة', desc: 'مقاهي ومطاعم وتجارب جديدة' },
                  { title: 'شريك ألعاب', desc: 'منافسات وبطولات إلكترونية' },
                  { title: 'مرافق لفعالية', desc: 'حضور حفلات ومعارض فنية' },
                  { title: 'شريك رياضة', desc: 'جري وتمارين ولياقة بدنية' },
                  { title: 'تصوير', desc: 'جلسات تصوير شخصية ومشاريع' },
                  { title: 'مساعدة في مهمة', desc: 'إنجاز مشاوير وتسوق وسفر' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSearchQuery(item.title);
                      setCurrentView('services');
                    }}
                    className="bg-[#11131c] hover:bg-[#151824] border border-zinc-800 hover:border-purple-600/40 rounded-xl p-3.5 cursor-pointer transition-all text-right group"
                  >
                    <div className="text-sm font-bold text-zinc-200 group-hover:text-purple-300 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 line-clamp-1">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Members Ribbon */}
            {members.length > 0 && (
              <div className="bg-[#10121a] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>أحدث أعضاء المجتمع المتاحين</span>
                  </h3>
                  <button
                    onClick={() => setCurrentView('profile')}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    رؤية الملفات الشخصية
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {members.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setCurrentView('services')}
                      className="bg-[#141722] p-3 rounded-xl border border-zinc-800/70 hover:border-purple-500/30 cursor-pointer flex items-center gap-3 transition-colors"
                    >
                      {m.photoUrl ? (
                        <img 
                          src={m.photoUrl} 
                          alt={m.name} 
                          className="w-10 h-10 rounded-full object-cover border border-zinc-700" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-300 font-bold text-sm">
                          {m.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-right overflow-hidden">
                        <div className="text-xs font-bold text-zinc-200 truncate">{m.name}</div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-zinc-400" />
                          <span>{m.governorate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            2. تسجيل عضو (REGISTER MEMBER)
           ========================================================================= */}
        {currentView === 'register' && (
          <div id="view-register" className="max-w-xl mx-auto space-y-6 pt-2">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/50 border border-purple-800/50 text-purple-300 text-xs">
                <UserPlus className="w-3.5 h-3.5" />
                <span>انضم للمجتمع</span>
              </div>
              <h2 className="text-2xl font-bold text-white">تسجيل عضو جديد</h2>
              <p className="text-xs text-zinc-400">
                شارك ما تستطيع تقديمه لأعضاء المجتمع، وما تحتاجه منهم.
              </p>
            </div>

            <form 
              id="form-register-member"
              onSubmit={handleRegisterMember}
              className="bg-[#12141e] border border-zinc-800/90 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl text-right"
            >
              {/* 1. الاسم */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  الاسم الكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-member-name"
                  type="text"
                  required
                  placeholder="مثال: أحمد محمود"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* 2. المحافظة */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  المحافظة <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-member-governorate"
                  value={regForm.governorate}
                  onChange={(e) => setRegForm({ ...regForm, governorate: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>

              {/* 3. صورة اختيارية */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  صورة شخصية (اختياري)
                </label>
                <input
                  id="input-member-photo"
                  type="url"
                  placeholder="رابط الصورة (URL) أو اتركه فارغاً"
                  value={regForm.photoUrl}
                  onChange={(e) => setRegForm({ ...regForm, photoUrl: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* 4. ماذا أستطيع أن أقدم؟ */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  ماذا أستطيع أن أقدم؟ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="textarea-member-can-offer"
                  required
                  rows={2}
                  placeholder="مثال: صديق ليوم للمحادثة والتنزه، تصوير بكاميرا احترافية، مساعدة في تنظيم ملفات..."
                  value={regForm.canOffer}
                  onChange={(e) => setRegForm({ ...regForm, canOffer: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              {/* 5. ماذا أحتاج؟ */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  ماذا أحتاج؟ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="textarea-member-needs"
                  required
                  rows={2}
                  placeholder="مثال: شريك جري صباحي، مرافق لحضور معرض فني، شريك ألعاب لوحية..."
                  value={regForm.needs}
                  onChange={(e) => setRegForm({ ...regForm, needs: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              {/* 6. وسيلة تواصل */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  وسيلة تواصل <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-member-contact"
                  type="text"
                  required
                  placeholder="رقم الهاتف أو واتساب أو إيميل (مثال: 01012345678)"
                  value={regForm.contact}
                  onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Submit */}
              <button
                id="btn-submit-registration"
                type="submit"
                disabled={isSubmittingMember}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSubmittingMember ? (
                  <span>جاري حفظ العضوية...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد التسجيل في المجتمع</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            3. صفحة الخدمات (SERVICES)
           ========================================================================= */}
        {currentView === 'services' && (
          <div id="view-services" className="space-y-6 pt-2">
            {/* Header & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  <span>دليل الخدمات والتجارب</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  تصفح ما يشاركه الأعضاء واطلب الخدمة التي تحتاجها مباشرة
                </p>
              </div>

              <button
                id="btn-open-add-service-modal"
                onClick={() => {
                  if (!checkCanAddService()) return;
                  setEditingService(null);
                  setServiceForm({
                    title: '',
                    providerName: loggedInMember?.name || currentUser?.displayName || '',
                    governorate: loggedInMember?.governorate || 'القاهرة',
                    price: 'مجانًا',
                    paymentMethod: 'free',
                    paymentDetails: '',
                    description: '',
                  });
                  setIsServiceModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-600/40 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة خدمة جديدة</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="bg-[#10121a] p-3 rounded-xl border border-zinc-800 flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-services-search"
                  type="text"
                  placeholder="ابحث عن خدمة (مثلاً: صديق، ألعاب، تصوير...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0b0c12] border border-zinc-800 rounded-lg pr-9 pl-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 whitespace-nowrap">المحافظة:</span>
                <select
                  id="select-filter-governorate"
                  value={selectedGovernorate}
                  onChange={(e) => setSelectedGovernorate(e.target.value)}
                  className="bg-[#0b0c12] border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="الكل">كل المحافظات</option>
                  {EGYPT_GOVERNORATES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Services Cards Grid - Required format:
                - اسم الخدمة
                - مقدم الخدمة
                - المحافظة
                - السعر أو "مجانًا"
                - زر "طلب"
            */}
            {isLoading ? (
              <div className="text-center py-16 text-zinc-500 text-sm">
                جاري تحميل الخدمات من قاعدة البيانات...
              </div>
            ) : visibleServices.length === 0 ? (
              <div className="text-center py-16 bg-[#10121a] rounded-2xl border border-zinc-800/80 p-8 space-y-3">
                <Briefcase className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-zinc-400 text-sm">لا توجد خدمات مطابقة لبحثك حالياً.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGovernorate('الكل');
                  }}
                  className="text-xs text-purple-400 underline"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {visibleServices.map((service) => (
                  <div
                    key={service.id}
                    id={`service-card-${service.id}`}
                    className="bg-[#12141f] border border-zinc-800 hover:border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-sm text-right"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        {/* Price & Egyptian Payment Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            service.price === 'مجانًا'
                              ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                              : 'bg-purple-950/60 border-purple-700/50 text-purple-300'
                          }`}>
                            {service.price}
                          </span>

                          {/* Egyptian Payment Method Badge */}
                          {service.paymentMethod === 'vodafone_cash' && (
                            <span className="text-[10px] font-semibold bg-rose-950/70 border border-rose-800/80 text-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Smartphone className="w-2.5 h-2.5 text-rose-400" />
                              <span>فودافون كاش</span>
                            </span>
                          )}
                          {service.paymentMethod === 'instapay' && (
                            <span className="text-[10px] font-semibold bg-purple-950/70 border border-purple-800/80 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 text-purple-400" />
                              <span>إنستاباي InstaPay</span>
                            </span>
                          )}
                          {service.paymentMethod === 'cash' && (
                            <span className="text-[10px] font-semibold bg-amber-950/70 border border-amber-800/80 text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Coins className="w-2.5 h-2.5 text-amber-400" />
                              <span>كاش عند المقابلة</span>
                            </span>
                          )}
                          {(!service.paymentMethod || service.paymentMethod === 'free') && service.price === 'مجانًا' && (
                            <span className="text-[10px] font-semibold bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span>تبادل تجارب</span>
                            </span>
                          )}
                        </div>

                        {/* Governorate */}
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          <span>{service.governorate}</span>
                        </div>
                      </div>

                      {/* Service Title */}
                      <h3 className="text-sm font-bold text-zinc-100 group-hover:text-purple-300 transition-colors leading-snug">
                        {service.title}
                      </h3>

                      {/* Description if present */}
                      {service.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                      )}

                      {/* Payment transfer details note if available */}
                      {service.paymentDetails && (
                        <div className="text-[11px] text-zinc-400 bg-[#0c0d14] px-2.5 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-1.5">
                          <Wallet className="w-3 h-3 text-purple-400 shrink-0" />
                          <span className="text-zinc-300 truncate">{service.paymentDetails}</span>
                        </div>
                      )}

                      {/* Provider info with VIP / Pro badge */}
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-500">مقدم الخدمة:</span>
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const prov = members.find(m => m.name.toLowerCase() === service.providerName.toLowerCase() || (service.providerId && m.userId === service.providerId));
                            if (prov?.plan === 'vip') {
                              return (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 shadow-sm">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  <span>VIP</span>
                                </span>
                              );
                            }
                            if (prov?.plan === 'pro') {
                              return (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-0.5">
                                  <Sparkles className="w-3 h-3 text-purple-400" />
                                  <span>Pro موثق</span>
                                </span>
                              );
                            }
                            return null;
                          })()}
                          <span className="font-semibold text-zinc-300">{service.providerName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action button: زر "طلب" */}
                    <div className="pt-4 mt-2">
                      <button
                        id={`btn-order-${service.id}`}
                        onClick={() => {
                          setOrderModalService(service);
                          setOrderForm({
                            name: loggedInMember?.name || customUserSession?.name || currentUser?.displayName || '',
                            contact: loggedInMember?.contact || customUserSession?.email || currentUser?.email || '',
                            notes: '',
                            paymentMethod: service.paymentMethod || (service.price === 'مجانًا' ? 'free' : 'cash'),
                            paymentSenderInfo: '',
                          });
                        }}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(147,51,234,0.3)] flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>طلب هذه الخدمة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            4. خطط واشتراكات المنصة (PRICING & SUBSCRIPTIONS)
           ========================================================================= */}
        {currentView === 'pricing' && (
          <PricingSection
            currentMember={loggedInMember}
            onSelectPlan={(plan, cycle) => handleOpenSubscriptionCheckout(plan, cycle)}
            onOpenRegister={() => setCurrentView('register')}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* =========================================================================
            4. صفحة الملف الشخصي (PROFILE) - تعرض فقط ملف الشخص المسجل / الذي قام بالدخول
           ========================================================================= */}
        {currentView === 'profile' && (
          <div id="view-profile" className="space-y-6 pt-2">
            {loggedInMember ? (
              /* Case 1: Active Logged-in Member Profile */
              <div className="bg-[#12141f] border border-zinc-800/90 rounded-2xl p-6 space-y-6 text-right shadow-xl">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-zinc-800">
                  {loggedInMember.photoUrl ? (
                    <img
                      src={loggedInMember.photoUrl}
                      alt={loggedInMember.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/50 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-900 to-zinc-900 border-2 border-purple-600/50 flex items-center justify-center text-purple-200 text-2xl font-black">
                      {loggedInMember.name.charAt(0)}
                    </div>
                  )}

                  <div className="text-center sm:text-right space-y-1.5 flex-1">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-purple-400 font-bold">ملفك الشخصي كعضو في رفيق</div>
                        <h2 className="text-2xl font-bold text-white">{loggedInMember.name}</h2>
                      </div>
                      {loggedInMember.status === 'suspended' ? (
                        <span className="text-xs bg-rose-950/60 border border-rose-800 text-rose-400 px-2.5 py-0.5 rounded-full">
                          عضوية معطلة
                        </span>
                      ) : (
                        <span className="text-xs bg-emerald-950/60 border border-emerald-800 text-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>عضو نشط وموثق</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-zinc-400">
                      <div className="flex items-center gap-1 text-zinc-300">
                        <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        <span>محافظة {loggedInMember.governorate}</span>
                      </div>

                      <div className="flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{loggedInMember.rating.toFixed(1)}</span>
                        <span className="text-zinc-500 text-[10px]">({loggedInMember.ratingCount} تقييم)</span>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-400 flex items-center justify-center sm:justify-start gap-1 pt-1">
                      <Phone className="w-3 h-3 text-zinc-500" />
                      <span className="text-zinc-300 font-mono">{loggedInMember.contact}</span>
                    </div>
                  </div>
                </div>

                {/* Subscription & Membership Plan Status Card */}
                {(() => {
                  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === (loggedInMember.plan || 'free')) || SUBSCRIPTION_PLANS[0];
                  const myServicesCount = services.filter(s => s.providerName.toLowerCase() === loggedInMember.name.toLowerCase() || (s.providerId && s.providerId === currentUser?.uid)).length;
                  return (
                    <div className="bg-[#0f111d] p-4 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          currentPlan.id === 'vip' 
                            ? 'bg-amber-950 text-amber-400 border border-amber-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                            : currentPlan.id === 'pro'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800 shadow-[0_0_15px_rgba(147,51,234,0.2)]'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                        }`}>
                          {currentPlan.id === 'vip' ? <Crown className="w-6 h-6" /> : currentPlan.id === 'pro' ? <Sparkles className="w-6 h-6" /> : <Award className="w-6 h-6" />}
                        </div>
                        <div className="space-y-0.5 text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">باقة حسابك الحالية:</span>
                            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                              currentPlan.id === 'vip' ? 'bg-amber-900/60 text-amber-300 border border-amber-700' :
                              currentPlan.id === 'pro' ? 'bg-purple-900/60 text-purple-300 border border-purple-700' :
                              'bg-zinc-800 text-zinc-300'
                            }`}>
                              {currentPlan.name}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400">
                            الخدمات المنشورة: <strong className="text-zinc-200">{myServicesCount}</strong> من أصل{' '}
                            <strong className="text-zinc-200">{currentPlan.maxServices >= 900 ? 'غير محدود' : currentPlan.maxServices}</strong> خدمات مسموحة
                            {loggedInMember.planExpiresAt && (
                              <span className="mr-2 text-zinc-500">
                                • صالحة حتى: {new Date(loggedInMember.planExpiresAt).toLocaleDateString('ar-EG')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentView('pricing')}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(147,51,234,0.3)] flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <Crown className="w-4 h-4" />
                        <span>{currentPlan.id === 'vip' ? 'تفاصيل الاشتراكات' : 'ترقية باقة العضوية'}</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Profile Details Grid: ماذا أستطيع أن أقدم + ماذا أحتاج */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0e1017] p-4 rounded-xl border border-zinc-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                      <Check className="w-4 h-4 text-purple-400" />
                      <span>ماذا أستطيع أن أقدم (خدماتي للمجتمع)</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed bg-[#131622] p-3 rounded-lg border border-zinc-800">
                      {loggedInMember.canOffer}
                    </p>
                  </div>

                  <div className="bg-[#0e1017] p-4 rounded-xl border border-zinc-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <Search className="w-4 h-4 text-amber-400" />
                      <span>ماذا أحتاج (اهتماماتي والتجارب التي أبحث عنها)</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed bg-[#131622] p-3 rounded-lg border border-zinc-800">
                      {loggedInMember.needs}
                    </p>
                  </div>
                </div>

                {/* Section 1: خدماتي وتجاربي المعروضة في رفيق */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <button
                      id="btn-profile-add-service"
                      onClick={() => {
                        if (!checkCanAddService()) return;
                        setEditingService(null);
                        setServiceForm({
                          title: '',
                          providerName: loggedInMember.name,
                          governorate: loggedInMember.governorate,
                          price: 'مجانًا',
                          paymentMethod: 'free',
                          paymentDetails: '',
                          description: '',
                        });
                        setIsServiceModalOpen(true);
                      }}
                      className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-[0_0_10px_rgba(147,51,234,0.3)] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة خدمة جديدة</span>
                    </button>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      خدماتي المعروضة في رفيق ({services.filter((s) => s.providerName === loggedInMember.name || s.providerId === currentUser?.uid).length})
                    </h3>
                  </div>

                  {services.filter((s) => s.providerName === loggedInMember.name || s.providerId === currentUser?.uid).length === 0 ? (
                    <div className="text-center py-8 bg-[#0e1017] rounded-xl border border-zinc-800/60 p-4 space-y-2">
                      <p className="text-xs text-zinc-400">لم تقم بإضافة خدمات أو تجارب في المنصة حتى الآن.</p>
                      <button
                        onClick={() => {
                          if (!checkCanAddService()) return;
                          setEditingService(null);
                          setServiceForm({
                            title: '',
                            providerName: loggedInMember.name,
                            governorate: loggedInMember.governorate,
                            price: 'مجانًا',
                            paymentMethod: 'free',
                            paymentDetails: '',
                            description: '',
                          });
                          setIsServiceModalOpen(true);
                        }}
                        className="text-xs text-purple-400 underline font-semibold"
                      >
                        أضف أول خدمة أو تجربة الآن
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {services
                        .filter((s) => s.providerName === loggedInMember.name || s.providerId === currentUser?.uid)
                        .map((s) => (
                          <div key={s.id} className="bg-[#0e1017] p-3.5 rounded-xl border border-zinc-800 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-purple-300">{s.price}</span>
                              <div className="font-bold text-xs text-zinc-100">{s.title}</div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span>المحافظة: {s.governorate}</span>
                              {s.paymentMethod === 'vodafone_cash' && <span className="text-rose-400">فودافون كاش</span>}
                              {s.paymentMethod === 'instapay' && <span className="text-purple-400">إنستاباي</span>}
                              {s.paymentMethod === 'cash' && <span className="text-amber-400">كاش عند المقابلة</span>}
                              {(!s.paymentMethod || s.paymentMethod === 'free') && <span className="text-emerald-400">مجانًا</span>}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/70 justify-end">
                              <button
                                onClick={() => {
                                  setEditingService(s);
                                  setServiceForm({
                                    title: s.title,
                                    providerName: s.providerName,
                                    governorate: s.governorate,
                                    price: s.price,
                                    paymentMethod: s.paymentMethod || 'free',
                                    paymentDetails: s.paymentDetails || '',
                                    description: s.description || '',
                                  });
                                  setIsServiceModalOpen(true);
                                }}
                                className="text-[11px] px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>تعديل</span>
                              </button>
                              <button
                                onClick={() => handleDeleteService(s.id)}
                                className="text-[11px] px-2.5 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Section 2: طلباتي في المنصة (سجل الخدمات التي طلبتها) */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    طلباتي في المنصة ({orders.filter((o) => o.requesterName.toLowerCase() === loggedInMember.name.toLowerCase() || o.requesterContact.includes(loggedInMember.contact)).length})
                  </h3>

                  {orders.filter((o) => o.requesterName.toLowerCase() === loggedInMember.name.toLowerCase() || o.requesterContact.includes(loggedInMember.contact)).length === 0 ? (
                    <div className="text-center py-6 bg-[#0e1017] rounded-xl border border-zinc-800/60 p-4">
                      <p className="text-xs text-zinc-500">لم تقم بإرسال أي طلبات بعد. تصفح قسم الخدمات والتجارب واطلب ما تحتاجه!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orders
                        .filter((o) => o.requesterName.toLowerCase() === loggedInMember.name.toLowerCase() || o.requesterContact.includes(loggedInMember.contact))
                        .map((o) => (
                          <div key={o.id} className="bg-[#0e1017] p-3 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-zinc-200">{o.serviceTitle}</div>
                              <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                                <span>مقدم الخدمة: <strong className="text-zinc-300">{o.providerName}</strong></span>
                                <span>•</span>
                                <span>بتاريخ: {new Date(o.createdAt).toLocaleDateString('ar-EG')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {o.paymentMethod && (
                                <span className="text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                                  {o.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : o.paymentMethod === 'instapay' ? 'إنستاباي' : o.paymentMethod === 'cash' ? 'كاش' : 'مجاني'}
                                </span>
                              )}
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                o.status === 'approved' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                                o.status === 'completed' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                                o.status === 'rejected' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                                'bg-amber-950 text-amber-300 border-amber-800'
                              }`}>
                                {o.status === 'approved' ? 'تم القبول' : o.status === 'completed' ? 'مكتمل' : o.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : isAdminUnlocked ? (
              /* Case 2: Admin Profile */
              <div className="bg-[#12141f] border border-rose-900/50 rounded-2xl p-6 space-y-5 text-right shadow-xl">
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                  <div className="w-14 h-14 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs text-rose-400 font-bold">حساب إدارة المنصة</span>
                    <h2 className="text-xl font-black text-white">المدير المسؤول عن رفيق</h2>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  أنت مسجل حالياً كمسؤول للمنصة. يمكنك مراجعة طلبات الأعضاء، وإيقاف أو تفعيل العضويات، والتحكم بالخدمات والتجارب المنشورة.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => setCurrentView('admin')}
                    className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>فتح لوحة الإدارة الكاملة</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('register')}
                    className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all"
                  >
                    تسجيل ملف شخصي كعضو
                  </button>
                </div>
              </div>
            ) : currentUser || customUserSession ? (
              /* Case 3: Logged in as user but hasn't registered member card yet */
              <div className="bg-[#12141f] border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-xl max-w-lg mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-purple-950/70 border border-purple-800/80 mx-auto flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                  <UserPlus className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">
                    أهلاً بك يا {customUserSession?.name || currentUser?.displayName || 'عضو رفيق'}!
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    أنت مسجل الدخول، لكنك لم تكمل بطاقة عضويتك في المجتمع بعد. سجل ما تستطيع تقديمه وما تحتاجه لتبدأ تبادل التجارب.
                  </p>
                </div>
                <button
                  id="btn-complete-profile"
                  onClick={() => setCurrentView('register')}
                  className="py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-all inline-flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إكمال وتسجيل ملف العضوية الآن</span>
                </button>
              </div>
            ) : (
              /* Case 4: Not logged in at all */
              <div className="bg-[#12141f] border border-zinc-800 rounded-2xl p-8 text-center space-y-5 shadow-xl max-w-md mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 mx-auto flex items-center justify-center text-purple-400 shadow-md">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">الملف الشخصي للأعضاء</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    قم بتسجيل الدخول أو إنشاء حساب لعرض ملفك الشخصي وإدارة خدماتك وتجاربك ومتابعة طلباتك.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    id="btn-profile-login"
                    onClick={() => setIsLoginModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول</span>
                  </button>
                  <button
                    id="btn-profile-register"
                    onClick={() => setCurrentView('register')}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors"
                  >
                    تسجيل عضو جديد
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            5. لوحة Admin بسيطة (ADMIN PANEL)
            المطلوب:
            أنا فقط أستطيع:
            - رؤية الأعضاء
            - إضافة/حذف/تعديل الخدمات
            - إيقاف عضو
            - مراجعة الطلبات
           ========================================================================= */}
        {currentView === 'admin' && (
          <div id="view-admin" className="space-y-6 pt-2">
            {!isAdminUnlocked ? (
              <div className="max-w-md mx-auto bg-[#141624] border border-rose-900/60 rounded-3xl p-8 text-center shadow-[0_0_40px_rgba(244,63,94,0.15)] space-y-5 my-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-950/70 border border-rose-800/80 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.35)]">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">منطقة محمية (خاصة بالإدارة)</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    لوحة التحكم مقتصرة على إدارة المنصة فقط. يرجى تسجيل الدخول بحساب الإدارة للمتابعة.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    id="btn-admin-gate-login"
                    onClick={() => {
                      setIsLoginModalOpen(true);
                    }}
                    className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 transition-all"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>تسجيل الدخول للمتابعة</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('home')}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium transition-colors"
                  >
                    العودة للصفحة الرئيسية
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-[#141624] border border-rose-900/40 rounded-2xl p-5 text-right shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>لوحة تحكم الإدارة (Admin)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        جلسة موثقة
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {ADMIN_EMAIL}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400">
                    أهلاً بك يا مدير المنصة. يمكنك الآن إدارة الأعضاء، تعديل وحذف الخدمات، ومراجعة وتحديث حالة الطلبات.
                  </p>
                </div>

            {/* Admin Tabs Navigation Bar */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto text-right">
              <button
                id="tab-admin-orders"
                onClick={() => setAdminActiveTab('orders')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  adminActiveTab === 'orders' 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>مراجعة الطلبات ({orders.length})</span>
              </button>

              <button
                id="tab-admin-subscriptions"
                onClick={() => setAdminActiveTab('subscriptions')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  adminActiveTab === 'subscriptions' 
                    ? 'bg-amber-600 text-white shadow-md' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>اشتراكات المنصة والباقات ({subscriptions.length})</span>
                {subscriptions.filter(s => s.status === 'pending').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
                )}
              </button>

              <button
                id="tab-admin-services"
                onClick={() => setAdminActiveTab('services')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  adminActiveTab === 'services' 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>إدارة الخدمات ({services.length})</span>
              </button>

              <button
                id="tab-admin-members"
                onClick={() => setAdminActiveTab('members')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  adminActiveTab === 'members' 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>الأعضاء وتحديد الباقات ({members.length})</span>
              </button>
            </div>

            {/* Admin Tabs Content */}
            <div className="grid grid-cols-1 gap-6 text-right">
              {/* Section 1: مراجعة الطلبات */}
              {adminActiveTab === 'orders' && (
                <div className="bg-[#12141f] border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-purple-400" />
                      <span>مراجعة الطلبات ({orders.length})</span>
                    </h3>
                    <span className="text-xs text-zinc-500">طلبات الأعضاء للخدمات</span>
                  </div>

                  {orders.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">لا توجد طلبات مسجلة حتى الآن.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-[#0c0e15] border border-zinc-800/80 p-3.5 rounded-xl space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-zinc-200">{order.serviceTitle}</span>
                              <span className="text-[11px] text-zinc-500 mr-2">مقدم الخدمة: {order.providerName || 'غير محدد'}</span>
                            </div>
                            {/* Status Badge & Controls */}
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                order.status === 'approved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                                order.status === 'rejected' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                                order.status === 'completed' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                                'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}>
                                {order.status === 'approved' ? 'مقبول' : order.status === 'rejected' ? 'مرفوض' : order.status === 'completed' ? 'مكتمل' : 'قيد المراجعة'}
                              </span>

                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'approved')}
                                title="قبول"
                                className="p-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-400"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'rejected')}
                                title="رفض"
                                className="p-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-zinc-400 flex flex-wrap gap-4 pt-1 border-t border-zinc-900">
                            <span>طالب الخدمة: <strong className="text-zinc-200">{order.requesterName}</strong></span>
                            <span>التواصل: <strong className="text-zinc-200">{order.requesterContact}</strong></span>
                            {order.notes && <span>ملاحظات: <span className="text-zinc-300">{order.notes}</span></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Section 2: اشتراكات المنصة وخطط الدفع في مصر (فودافون كاش وإنستاباي) */}
              {adminActiveTab === 'subscriptions' && (
                <div className="bg-[#12141f] border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">طلبات ترقية الاشتراكات ({subscriptions.length})</h3>
                        <p className="text-[11px] text-zinc-400">مراجعة تحويلات فودافون كاش وإنستاباي وتفعيل باقات الأعضاء</p>
                      </div>
                    </div>
                    <div className="text-xs bg-[#0c0e15] border border-zinc-800 px-3 py-1 rounded-xl text-zinc-300">
                      معلق: <span className="text-amber-400 font-bold">{subscriptions.filter(s => s.status === 'pending').length}</span>
                    </div>
                  </div>

                  {subscriptions.length === 0 ? (
                    <div className="text-center py-10 space-y-2 bg-[#0c0e15] rounded-xl border border-zinc-800/60 p-4">
                      <Crown className="w-8 h-8 text-zinc-600 mx-auto" />
                      <p className="text-xs text-zinc-400">لا توجد طلبات اشتراك مسجلة حالياً.</p>
                      <p className="text-[11px] text-zinc-600">ستظهر هنا طلبات الترقية لباقة برو والنخبة فور إرسالها من الأعضاء.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {subscriptions.map((sub) => (
                        <div
                          key={sub.id}
                          className={`bg-[#0c0e15] border rounded-2xl p-4 space-y-3 transition-colors ${
                            sub.status === 'pending'
                              ? 'border-amber-700/60 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                              : sub.status === 'approved'
                              ? 'border-emerald-800/50'
                              : 'border-zinc-800/70 opacity-70'
                          }`}
                        >
                          {/* Row 1: Member + Plan Badge + Amount */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">{sub.memberName}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                (sub.plan || sub.planId) === 'vip' 
                                  ? 'bg-amber-950 text-amber-300 border border-amber-700' 
                                  : 'bg-purple-950 text-purple-300 border border-purple-700'
                              }`}>
                                {sub.planName || ((sub.plan || sub.planId) === 'vip' ? 'النخبة VIP' : 'رفيق برو')} ({sub.billingCycle === 'annual' ? 'اشتراك سنوي' : 'اشتراك شهري'})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-amber-400 font-mono">
                                {sub.amount} {sub.currency || 'ج.م'}
                              </span>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                sub.status === 'approved'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : sub.status === 'rejected'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse'
                              }`}>
                                {sub.status === 'approved' ? 'مقبول ومفعل' : sub.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Payment Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs bg-[#11131e] p-3 rounded-xl border border-zinc-800/80">
                            <div>
                              <span className="text-zinc-500 block text-[10px]">طريقة الدفع:</span>
                              <span className="font-semibold text-zinc-200">
                                {sub.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : 'إنستاباي (InstaPay)'}
                              </span>
                            </div>

                            <div>
                              <span className="text-zinc-500 block text-[10px]">رقم المحول / العنوان:</span>
                              <span className="font-mono text-zinc-200 text-xs dir-ltr inline-block">
                                {sub.paymentSenderInfo}
                              </span>
                            </div>

                            <div>
                              <span className="text-zinc-500 block text-[10px]">رقم العملية (إن وجد):</span>
                              <span className="font-mono text-zinc-300 text-[11px]">
                                {sub.transactionRef || sub.referenceCode || 'لم يُحدد'}
                              </span>
                            </div>

                            <div>
                              <span className="text-zinc-500 block text-[10px]">بيانات الاتصال:</span>
                              <span className="text-zinc-200 text-xs">
                                {sub.memberContact}
                              </span>
                            </div>
                          </div>

                          {/* Row 3: Actions for Admin */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-zinc-500">
                              تاريخ الطلب: {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                            </span>

                            {sub.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReviewSubscription(sub, 'approved')}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>قبول وتفعيل الباقة فورا</span>
                                </button>
                                <button
                                  onClick={() => handleReviewSubscription(sub, 'rejected')}
                                  className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800/70 text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>رفض الطلب</span>
                                </button>
                              </div>
                            )}

                            {sub.status !== 'pending' && (
                              <button
                                onClick={() => handleReviewSubscription(sub, sub.status === 'approved' ? 'rejected' : 'approved')}
                                className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                              >
                                {sub.status === 'approved' ? 'إلغاء التفعيل' : 'إعادة تفعيل الباقة'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: إدارة الخدمات (إضافة/حذف/تعديل) */}
              {adminActiveTab === 'services' && (
                <div className="bg-[#12141f] border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-400" />
                      <span>إدارة الخدمات ({services.length})</span>
                    </h3>
                    <button
                      onClick={() => {
                        setEditingService(null);
                        setServiceForm({
                          title: '',
                          providerName: 'المشرف',
                          governorate: 'القاهرة',
                          price: 'مجانًا',
                          paymentMethod: 'free',
                          paymentDetails: '',
                          description: '',
                        });
                        setIsServiceModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة خدمة</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {services.map((svc) => (
                      <div
                        key={svc.id}
                        className="bg-[#0c0e15] border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="overflow-hidden">
                          <div className="text-xs font-bold text-zinc-200 truncate">{svc.title}</div>
                          <div className="text-[11px] text-zinc-500">
                            بواسطة: {svc.providerName} • {svc.governorate} • {svc.price}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingService(svc);
                              setServiceForm({
                                title: svc.title,
                                providerName: svc.providerName,
                                governorate: svc.governorate,
                                price: svc.price,
                                paymentMethod: svc.paymentMethod || 'free',
                                paymentDetails: svc.paymentDetails || '',
                                description: svc.description || '',
                              });
                              setIsServiceModalOpen(true);
                            }}
                            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                            title="تعديل الخدمة"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(svc.id)}
                            className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-400 text-xs"
                            title="حذف الخدمة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: رؤية الأعضاء وإيقاف عضو وتعديل الباقات */}
              {adminActiveTab === 'members' && (
                <div className="bg-[#12141f] border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400" />
                      <span>الأعضاء وتحديد الباقات ({members.length})</span>
                    </h3>
                    <span className="text-xs text-zinc-500">تعديل باقة العضو وحالة الحساب</span>
                  </div>

                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="bg-[#0c0e15] border border-zinc-800/80 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-950 text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                              <span>{member.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                member.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-400'
                              }`}>
                                {member.status === 'active' ? 'نشط' : 'موقوف'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                member.plan === 'vip' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                                member.plan === 'pro' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                                'bg-zinc-800 text-zinc-400'
                              }`}>
                                {member.plan === 'vip' ? '👑 النخبة VIP' : member.plan === 'pro' ? '⭐ رفيق برو' : 'مجانية'}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-1">
                              <span className="text-zinc-500">يقدم:</span> {member.canOffer} • <span className="text-zinc-500">يحتاج:</span> {member.needs}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              {member.governorate} • تواصل: {member.contact}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">
                          {/* Plan Switcher for Admin */}
                          <div className="flex items-center gap-1.5 bg-[#141624] px-2 py-1 rounded-lg border border-zinc-800">
                            <span className="text-[11px] text-zinc-500">الباقة:</span>
                            <select
                              value={member.plan || 'free'}
                              onChange={(e) => handleAdminChangeMemberPlan(member.id, e.target.value as 'free' | 'pro' | 'vip')}
                              className="bg-[#0b0c13] text-zinc-200 text-xs rounded border border-zinc-700 px-2 py-1 focus:outline-none focus:border-purple-500"
                            >
                              <option value="free">مجانية (2 خدمة)</option>
                              <option value="pro">رفيق برو (7 خدمات)</option>
                              <option value="vip">النخبة VIP (غير محدود)</option>
                            </select>
                          </div>

                          <button
                            onClick={() => handleToggleMemberStatus(member)}
                            className={`text-xs px-3 py-1 rounded font-semibold transition-colors ${
                              member.status === 'active'
                                ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60'
                                : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60'
                            }`}
                          >
                            {member.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          ORDER MODAL (نافذة إرسال طلب خدمة)
         ========================================================================= */}
      {orderModalService && (
        <div 
          id="modal-order-service"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#131522] border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-right animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                onClick={() => setOrderModalService(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-sm text-white">طلب خدمة: {orderModalService.title}</h3>
            </div>

            {/* Service & Payment Overview */}
            <div className="text-xs text-zinc-300 bg-[#0c0e15] p-3 rounded-xl border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">مقدم الخدمة:</span>
                <strong className="text-zinc-200">{orderModalService.providerName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">المحافظة:</span>
                <span className="text-zinc-300">{orderModalService.governorate}</span>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800/60 pt-1.5">
                <span className="text-zinc-500">المقابل المطلوب:</span>
                <strong className="text-purple-400 font-bold">{orderModalService.price}</strong>
              </div>

              {/* Provider's Accepted Payment Method */}
              {orderModalService.paymentMethod === 'vodafone_cash' && (
                <div className="bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-lg space-y-1 mt-1">
                  <div className="text-rose-300 font-semibold flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                    <span>طريقة الدفع: فودافون كاش / محفظة إلكترونية</span>
                  </div>
                  {orderModalService.paymentDetails && (
                    <div className="text-[11px] text-zinc-300 flex items-center justify-between pt-1">
                      <span>رقم التحويل لمقدم الخدمة:</span>
                      <span className="font-mono text-rose-200 font-bold px-2 py-0.5 bg-rose-950/80 rounded border border-rose-800">
                        {orderModalService.paymentDetails}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {orderModalService.paymentMethod === 'instapay' && (
                <div className="bg-purple-950/40 border border-purple-800/60 p-2.5 rounded-lg space-y-1 mt-1">
                  <div className="text-purple-300 font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>طريقة الدفع: إنستاباي InstaPay</span>
                  </div>
                  {orderModalService.paymentDetails && (
                    <div className="text-[11px] text-zinc-300 flex items-center justify-between pt-1">
                      <span>معرّف إنستاباي لمقدم الخدمة:</span>
                      <span className="font-mono text-purple-200 font-bold px-2 py-0.5 bg-purple-950/80 rounded border border-purple-800">
                        {orderModalService.paymentDetails}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {orderModalService.paymentMethod === 'cash' && (
                <div className="bg-amber-950/40 border border-amber-800/60 p-2 rounded-lg text-amber-300 text-[11px] flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>طريقة الدفع: نقدًا (كاش عند المقابلة والتنفيذ)</span>
                </div>
              )}

              {(!orderModalService.paymentMethod || orderModalService.paymentMethod === 'free') && orderModalService.price === 'مجانًا' && (
                <div className="bg-emerald-950/40 border border-emerald-800/60 p-2 rounded-lg text-emerald-300 text-[11px] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>هذه الخدمة مجانية (تبادل تجارب دون مقابل مالي)</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  اسمك <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد علي"
                  value={orderForm.name}
                  onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  وسيلة التواصل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="رقم الهاتف أو واتساب أو إيميل"
                  value={orderForm.contact}
                  onChange={(e) => setOrderForm({ ...orderForm, contact: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Payment Method Selection for Egypt */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  طريقة الدفع المختارة (نظام الدفع في مصر)
                </label>
                <select
                  value={orderForm.paymentMethod}
                  onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value as any })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="free">مجانًا / تبادل تجارب</option>
                  <option value="vodafone_cash">فودافون كاش / محفظة إلكترونية</option>
                  <option value="instapay">إنستاباي InstaPay</option>
                  <option value="cash">كاش نقدًا عند المقابلة</option>
                </select>
              </div>

              {/* If Vodafone Cash or InstaPay, input for sender verification */}
              {(orderForm.paymentMethod === 'vodafone_cash' || orderForm.paymentMethod === 'instapay') && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    {orderForm.paymentMethod === 'vodafone_cash' 
                      ? 'رقم المحفظة التي قمت أو ستقوم بالتحويل منها' 
                      : 'معرّف أو رقم حساب إنستاباي المحوّل منه'} (اختياري للتأكيد)
                  </label>
                  <input
                    type="text"
                    placeholder={orderForm.paymentMethod === 'vodafone_cash' ? 'مثال: 01012345678' : 'مثال: username@instapay'}
                    value={orderForm.paymentSenderInfo}
                    onChange={(e) => setOrderForm({ ...orderForm, paymentSenderInfo: e.target.value })}
                    className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ملاحظات أو تفاصيل الموعد المطلوب (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="حدد اليوم والوقت المناسب لك أو أي تفاصيل إضافية..."
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderModalService(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingOrder ? 'جاري الإرسال...' : 'تأكيد إرسال الطلب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SERVICE ADD / EDIT MODAL (إضافة / تعديل خدمة)
         ========================================================================= */}
      {isServiceModalOpen && (
        <div 
          id="modal-service-form"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#131522] border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-right animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-sm text-white">
                {editingService ? 'تعديل الخدمة' : 'إضافة خدمة أو تجربة جديدة'}
              </h3>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  اسم الخدمة أو التجربة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: صديق ليوم / شريك ألعاب / مساعدة مكتبية..."
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    اسم مقدم الخدمة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="اسمك أو لقبك"
                    value={serviceForm.providerName}
                    onChange={(e) => setServiceForm({ ...serviceForm, providerName: e.target.value })}
                    className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    السعر أو "مجانًا" <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مجانًا، أو 100 ج.م"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Egyptian Payment Method */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    طريقة استلام المقابل في مصر
                  </label>
                  <select
                    value={serviceForm.paymentMethod}
                    onChange={(e) => setServiceForm({ ...serviceForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="free">مجانًا (تبادل تجارب)</option>
                    <option value="vodafone_cash">فودافون كاش</option>
                    <option value="instapay">إنستاباي (InstaPay)</option>
                    <option value="cash">كاش عند المقابلة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    المحافظة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={serviceForm.governorate}
                    onChange={(e) => setServiceForm({ ...serviceForm, governorate: e.target.value })}
                    className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                  >
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment details if electronic */}
              {(serviceForm.paymentMethod === 'vodafone_cash' || serviceForm.paymentMethod === 'instapay') && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    {serviceForm.paymentMethod === 'vodafone_cash' 
                      ? 'رقم محفظة فودافون كاش لاستلام التحويل' 
                      : 'معرّف أو رقم إنستاباي لاستلام التحويل'}
                  </label>
                  <input
                    type="text"
                    placeholder={serviceForm.paymentMethod === 'vodafone_cash' ? 'مثال: 01012345678' : 'مثال: username@instapay'}
                    value={serviceForm.paymentDetails}
                    onChange={(e) => setServiceForm({ ...serviceForm, paymentDetails: e.target.value })}
                    className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  تفاصيل وتوضيح عن الخدمة
                </label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر للنشاط أو التجربة أو الخدمة..."
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full bg-[#0c0e15] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                >
                  {editingService ? 'تحديث الخدمة' : 'نشر الخدمة في المنصة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          Mobile Bottom Navigation Bar (Mobile First Requirement)
         ========================================================================= */}
      <div 
        id="mobile-nav-bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e15]/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 py-2"
      >
        <div className="flex items-center justify-around">
          <button
            id="mobile-nav-home"
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-xl transition-colors ${
              currentView === 'home' ? 'text-purple-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>

          <button
            id="mobile-nav-services"
            onClick={() => setCurrentView('services')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-xl transition-colors ${
              currentView === 'services' ? 'text-purple-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>الخدمات</span>
          </button>

          <button
            id="mobile-nav-pricing"
            onClick={() => setCurrentView('pricing')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-xl transition-colors ${
              currentView === 'pricing' ? 'text-amber-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>الاشتراكات</span>
          </button>

          <button
            id="mobile-nav-register"
            onClick={() => setCurrentView('register')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-xl transition-colors ${
              currentView === 'register' ? 'text-purple-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>عضوية</span>
          </button>

          <button
            id="mobile-nav-profile"
            onClick={() => setCurrentView('profile')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-xl transition-colors ${
              currentView === 'profile' ? 'text-purple-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>الملف</span>
          </button>

          {isAdminUnlocked && (
            <button
              id="mobile-nav-admin"
              onClick={() => setCurrentView('admin')}
              className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-xl transition-colors ${
                currentView === 'admin' ? 'text-rose-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>الأدمن</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          LOGIN / AUTHENTICATION MODAL (نظام تسجيل الدخول والخروج الموحد والسري)
         ========================================================================= */}
      {isLoginModalOpen && (
        <div 
          id="modal-login"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-right"
        >
          <div className="bg-[#12141f] border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setLoginError(null);
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">تسجيل الدخول</h3>
                <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-800/80 flex items-center justify-center text-purple-400">
                  <LogIn className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-xs text-zinc-400 leading-relaxed">
              سجل الدخول بحسابك للوصول إلى ملفك الشخصي وإدارة خدماتك ومتابعة طلباتك في مجتمع رفيق.
            </p>

            {/* Error Message */}
            {loginError && (
              <div className="bg-rose-950/50 border border-rose-800/70 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Unified Clean Login Form */}
            <form onSubmit={handleUnifiedLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  البريد الإلكتروني أو اسم المستخدم <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="أدخل بريدك الإلكتروني أو اسمك"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-[#0a0b12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#0a0b12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                id="btn-submit-unified-login"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-zinc-800 w-full"></div>
                <span className="bg-[#12141f] px-3 text-[11px] text-zinc-500 absolute">أو</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 rounded-xl bg-[#191b28] hover:bg-[#202334] border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>تسجيل الدخول السريع بحساب Google</span>
              </button>

              {/* Registration Link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setCurrentView('register');
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                >
                  ليس لديك حساب بعد؟ سجل كعضو جديد في المنصة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUBSCRIPTION CHECKOUT MODAL (نافذة تأكيد الاشتراك والدفع في مصر)
         ========================================================================= */}
      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        selectedPlan={subModalPlan}
        billingCycle={subModalCycle}
        memberName={loggedInMember?.name || customUserSession?.name || currentUser?.displayName || ''}
        memberContact={loggedInMember?.contact || customUserSession?.email || currentUser?.email || ''}
        onSubmitSubscription={handleSubmitSubscription}
      />
    </div>
  );
}

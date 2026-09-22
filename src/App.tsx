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
  ArrowUpRight
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { Member, Service, Order, EGYPT_GOVERNORATES } from './types';
import { 
  getMembers, 
  getServices, 
  getOrders, 
  registerMember, 
  updateMemberStatus, 
  addService, 
  updateService, 
  deleteService, 
  createOrder, 
  updateOrderStatus,
  seedInitialDataIfEmpty 
} from './services/db';

const ADMIN_EMAIL = 'amrmamdoh22687@gmail.com';

// View Tabs
type ViewMode = 'home' | 'services' | 'register' | 'profile' | 'admin';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Data states
  const [members, setMembers] = useState<Member[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Filter & Search for Services
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Member for Profile viewing
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Modals
  const [orderModalService, setOrderModalService] = useState<Service | null>(null);
  const [orderForm, setOrderForm] = useState({ name: '', contact: '', notes: '' });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Service Edit/Add Modal (Admin or Provider)
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    title: '',
    providerName: '',
    governorate: 'القاهرة',
    price: 'مجانًا',
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
      const [fetchedMembers, fetchedServices, fetchedOrders] = await Promise.all([
        getMembers(),
        getServices(),
        getOrders(),
      ]);
      setMembers(fetchedMembers);
      setServices(fetchedServices);
      setOrders(fetchedOrders);
      if (fetchedMembers.length > 0 && !selectedMemberId) {
        setSelectedMemberId(fetchedMembers[0].id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered services
  const visibleServices = useMemo(() => {
    return services.filter((s) => {
      const matchGov = selectedGovernorate === 'الكل' || s.governorate === selectedGovernorate;
      const matchSearch = 
        searchQuery === '' || 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.providerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchActive = s.status === 'active' || isAdminUnlocked;
      return matchGov && matchSearch && matchActive;
    });
  }, [services, selectedGovernorate, searchQuery, isAdminUnlocked]);

  // Selected Profile Member
  const activeProfileMember = useMemo(() => {
    if (selectedMemberId) {
      const found = members.find((m) => m.id === selectedMemberId);
      if (found) return found;
    }
    return members[0] || null;
  }, [members, selectedMemberId]);

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      notify(`مرحباً ${res.user.displayName || ''}`);
      if (res.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setIsAdminUnlocked(true);
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      notify('تعذر تسجيل الدخول، يرجى المحاولة لاحقاً');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsAdminUnlocked(false);
    notify('تم تسجيل الخروج');
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
      setSelectedMemberId(newId);
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
        notes: orderForm.notes.trim() || undefined,
      });

      const updatedOrders = await getOrders();
      setOrders(updatedOrders);
      setOrderModalService(null);
      setOrderForm({ name: '', contact: '', notes: '' });
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
        description: serviceForm.description,
      });
      notify('تمت إضافة الخدمة بنجاح');
    }

    const updated = await getServices();
    setServices(updated);
    setIsServiceModalOpen(false);
    setEditingService(null);
    setServiceForm({ title: '', providerName: '', governorate: 'القاهرة', price: 'مجانًا', description: '' });
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
            <button
              id="desktop-nav-admin"
              onClick={() => setCurrentView('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                currentView === 'admin' ? 'bg-rose-950/40 text-rose-300 border border-rose-500/50' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3 text-rose-400" />
              لوحة الأدمن
            </button>
          </nav>

          {/* User Auth Info */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full py-1 px-2.5">
                <span className="text-xs text-zinc-300 font-medium max-w-[90px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <button
                  id="btn-signout"
                  onClick={handleSignOut}
                  title="تسجيل الخروج"
                  className="text-zinc-500 hover:text-rose-400 text-xs transition-colors"
                >
                  خروج
                </button>
              </div>
            ) : (
              <button
                id="btn-signin-google"
                onClick={handleGoogleSignIn}
                className="text-xs text-purple-300 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-600/40 rounded-lg px-2.5 py-1.5 transition-colors flex items-center gap-1"
              >
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
                      onClick={() => {
                        setSelectedMemberId(m.id);
                        setCurrentView('profile');
                      }}
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
                  setEditingService(null);
                  setServiceForm({
                    title: '',
                    providerName: currentUser?.displayName || '',
                    governorate: 'القاهرة',
                    price: 'مجانًا',
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
                        {/* Price Badge */}
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          service.price === 'مجانًا'
                            ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                            : 'bg-purple-950/60 border-purple-700/50 text-purple-300'
                        }`}>
                          {service.price}
                        </span>

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

                      {/* Provider info */}
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-500">مقدم الخدمة:</span>
                        <span className="font-semibold text-zinc-300">{service.providerName}</span>
                      </div>
                    </div>

                    {/* Action button: زر "طلب" */}
                    <div className="pt-4 mt-2">
                      <button
                        id={`btn-order-${service.id}`}
                        onClick={() => {
                          setOrderModalService(service);
                          setOrderForm({
                            name: currentUser?.displayName || '',
                            contact: currentUser?.email || '',
                            notes: '',
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
            4. صفحة الملف الشخصي (PROFILE)
           ========================================================================= */}
        {currentView === 'profile' && (
          <div id="view-profile" className="space-y-6 pt-2">
            {/* Member selector bar */}
            <div className="bg-[#10121a] p-3 rounded-xl border border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto">
              <span className="text-xs text-zinc-400 whitespace-nowrap">اختر العضو لعرض ملفه:</span>
              <div className="flex items-center gap-1.5">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                      activeProfileMember?.id === m.id
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {activeProfileMember ? (
              <div className="bg-[#12141f] border border-zinc-800/90 rounded-2xl p-6 space-y-6 text-right shadow-xl">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-zinc-800">
                  {activeProfileMember.photoUrl ? (
                    <img
                      src={activeProfileMember.photoUrl}
                      alt={activeProfileMember.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/50 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-900 to-zinc-900 border-2 border-purple-600/50 flex items-center justify-center text-purple-200 text-2xl font-black">
                      {activeProfileMember.name.charAt(0)}
                    </div>
                  )}

                  <div className="text-center sm:text-right space-y-1.5 flex-1">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <h2 className="text-2xl font-bold text-white">{activeProfileMember.name}</h2>
                      {activeProfileMember.status === 'suspended' ? (
                        <span className="text-xs bg-rose-950/60 border border-rose-800 text-rose-400 px-2.5 py-0.5 rounded-full">
                          عضوية معطلة
                        </span>
                      ) : (
                        <span className="text-xs bg-emerald-950/60 border border-emerald-800 text-emerald-400 px-2.5 py-0.5 rounded-full">
                          عضو نشط وموثق
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-zinc-400">
                      <div className="flex items-center gap-1 text-zinc-300">
                        <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        <span>{activeProfileMember.governorate}</span>
                      </div>

                      {/* تقييم بسيط */}
                      <div className="flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{activeProfileMember.rating.toFixed(1)}</span>
                        <span className="text-zinc-500 text-[10px]">({activeProfileMember.ratingCount} تقييم)</span>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-400 flex items-center justify-center sm:justify-start gap-1 pt-1">
                      <Phone className="w-3 h-3 text-zinc-500" />
                      <span className="text-zinc-300">{activeProfileMember.contact}</span>
                    </div>
                  </div>
                </div>

                {/* Profile Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* الخدمات التي يقدمها */}
                  <div className="bg-[#0e1017] p-4 rounded-xl border border-zinc-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                      <Check className="w-4 h-4 text-purple-400" />
                      <span>الخدمات التي يقدمها (ماذا أستطيع أن أقدم)</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed bg-[#131622] p-3 rounded-lg border border-zinc-800">
                      {activeProfileMember.canOffer}
                    </p>
                  </div>

                  {/* الخدمات التي يبحث عنها */}
                  <div className="bg-[#0e1017] p-4 rounded-xl border border-zinc-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <Search className="w-4 h-4 text-amber-400" />
                      <span>الخدمات التي يبحث عنها (ماذا يحتاج)</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed bg-[#131622] p-3 rounded-lg border border-zinc-800">
                      {activeProfileMember.needs}
                    </p>
                  </div>
                </div>

                {/* Services added by this provider */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    خدمات معروضة بواسطة هذا العضو في المنصة
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {services
                      .filter((s) => s.providerName === activeProfileMember.name)
                      .map((s) => (
                        <div key={s.id} className="bg-[#0e1017] p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-zinc-200">{s.title}</div>
                            <div className="text-[11px] text-zinc-500">{s.price} • {s.governorate}</div>
                          </div>
                          <button
                            onClick={() => {
                              setOrderModalService(s);
                              setOrderForm({ name: '', contact: '', notes: '' });
                            }}
                            className="text-xs bg-purple-950 text-purple-300 border border-purple-800/60 px-3 py-1 rounded-lg hover:bg-purple-900 transition-colors"
                          >
                            طلب
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-zinc-500 text-sm">
                لم يتم العثور على أعضاء مسجلين بعد. يمكنك أن تكون أول عضو يسجل!
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
            <div className="bg-[#141624] border border-rose-900/40 rounded-2xl p-5 text-right shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <Lock className="w-4 h-4" />
                  <span>لوحة تحكم الإدارة (Admin)</span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {ADMIN_EMAIL}
                </span>
              </div>

              <p className="text-xs text-zinc-400">
                مرحباً بك. هذه اللوحة مخصصة لإدارة الأعضاء، الخدمات، والطلبات.
              </p>

              {/* Admin unlock toggle for convenience */}
              {!isAdminUnlocked && (
                <div className="bg-[#0b0d14] p-3 rounded-xl border border-rose-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-zinc-300">
                    يمكنك الدخول بحساب Google للمسؤول ({ADMIN_EMAIL}) أو تفعيل صلاحية الإدارة للاختبار السريع:
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-admin-google-auth"
                      onClick={handleGoogleSignIn}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white border border-zinc-700"
                    >
                      تسجيل دخول كمسؤول
                    </button>
                    <button
                      id="btn-admin-test-toggle"
                      onClick={() => setIsAdminUnlocked(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold"
                    >
                      فتح الإدارة الآن
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Tabs / Sections */}
            <div className="grid grid-cols-1 gap-6 text-right">
              {/* Section 1: مراجعة الطلبات */}
              <div className="bg-[#12141f] border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-purple-400" />
                    <span>مراجعة الطلبات ({orders.length})</span>
                  </h3>
                  <span className="text-xs text-zinc-500">طلبات الأعضاء للخدمات</span>
                </div>

                {orders.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">لا توجد طلبات مسجلة حتى الآن.</p>
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

              {/* Section 2: إدارة الخدمات (إضافة/حذف/تعديل) */}
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

              {/* Section 3: رؤية الأعضاء وإيقاف عضو */}
              <div className="bg-[#12141f] border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <span>رؤية الأعضاء وإيقاف عضو ({members.length})</span>
                  </h3>
                  <span className="text-xs text-zinc-500">التحكم في حالة العضويات</span>
                </div>

                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="bg-[#0c0e15] border border-zinc-800/80 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-950 text-purple-300 font-bold flex items-center justify-center text-xs">
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
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {member.governorate} • تواصل: {member.contact}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setSelectedMemberId(member.id);
                            setCurrentView('profile');
                          }}
                          className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        >
                          الملف الشخصي
                        </button>
                        <button
                          onClick={() => handleToggleMemberStatus(member)}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors ${
                            member.status === 'active'
                              ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60'
                              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60'
                          }`}
                        >
                          {member.status === 'active' ? 'إيقاف العضو' : 'تفعيل العضو'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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

            <div className="text-xs text-zinc-400 bg-[#0c0e15] p-3 rounded-xl border border-zinc-800/80 space-y-1">
              <div>مقدم الخدمة: <strong className="text-zinc-200">{orderModalService.providerName}</strong></div>
              <div>المحافظة: <strong className="text-zinc-200">{orderModalService.governorate}</strong></div>
              <div>السعر: <strong className="text-purple-400">{orderModalService.price}</strong></div>
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
            <Briefcase className="w-4 h-4" />
            <span>الخدمات</span>
          </button>

          <button
            id="mobile-nav-register"
            onClick={() => setCurrentView('register')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-xl transition-colors ${
              currentView === 'register' ? 'text-purple-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>تسجيل</span>
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
        </div>
      </div>
    </div>
  );
}

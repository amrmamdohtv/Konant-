import React, { useState } from 'react';
import { 
  Check, 
  Crown, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  ArrowUpRight, 
  Star, 
  HelpCircle,
  Clock,
  Award
} from 'lucide-react';
import { SubscriptionPlan, Member } from '../types';
import { SUBSCRIPTION_PLANS, PLATFORM_PAYMENT_INFO } from '../data/plans';

interface PricingSectionProps {
  currentMember: Member | null;
  onSelectPlan: (plan: SubscriptionPlan, cycle: 'monthly' | 'annual') => void;
  onOpenRegister: () => void;
  onOpenLogin: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  currentMember,
  onSelectPlan,
  onOpenRegister,
  onOpenLogin,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const currentPlanId = currentMember?.plan || 'free';

  return (
    <div id="view-pricing" className="space-y-10 pt-2 text-right">
      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#131627] via-[#0e1019] to-[#090a0f] border border-zinc-800 p-6 md:p-10 text-center shadow-xl">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-700/50 text-amber-300 text-xs font-semibold shadow-sm">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>خطط واشتراكات مجتمع رفيق</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
            استثمر في انتشار مهاراتك وتجاربك
          </h1>

          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto">
            اختر الباقة التي تناسبك للوصول إلى آلاف المهتمين في مصر، مع شارات توثيق رسمية، وأولوية الظهور في صدارة النتائج.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <div className="bg-[#0b0c13] p-1 rounded-2xl border border-zinc-800 inline-flex items-center">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                اشتراك شهري
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>اشتراك مخفض</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  وفر 30%
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 ${
                plan.featured
                  ? 'bg-gradient-to-b from-[#181b2c] to-[#0f111c] border-2 border-purple-500/80 shadow-[0_0_35px_rgba(147,51,234,0.2)] md:-translate-y-2'
                  : plan.id === 'vip'
                  ? 'bg-gradient-to-b from-[#1c1813] to-[#0f0e0d] border border-amber-600/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                  : 'bg-[#10121b] border border-zinc-800/90'
              }`}
            >
              {/* Featured Badge */}
              {plan.featured && (
                <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-purple-600 text-white text-[11px] font-black shadow-md flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  <span>الأكثر طلباً بين الأعضاء</span>
                </div>
              )}

              {plan.id === 'vip' && (
                <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-amber-600 text-white text-[11px] font-black shadow-md flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-white" />
                  <span>نخبة شركاء رفيق</span>
                </div>
              )}

              <div className="space-y-5">
                {/* Plan Header */}
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        plan.id === 'vip'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : plan.id === 'pro'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {plan.badge}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>باقتك الحالية</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                    {plan.name}
                  </h3>

                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed min-h-[36px]">
                    {plan.tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{price}</span>
                    <span className="text-sm font-bold text-zinc-300">ج.م</span>
                    <span className="text-xs text-zinc-500 mr-1">
                      {plan.id === 'free'
                        ? 'مدى الحياة'
                        : billingCycle === 'annual'
                        ? '/ دفعة مخفضة'
                        : '/ شهرياً'}
                    </span>
                  </div>
                  {plan.id !== 'free' && billingCycle === 'annual' && (
                    <div className="text-[11px] text-amber-400/90 mt-0.5 font-medium">
                      وفرت 30% مقارنة بالدفع الشهري
                    </div>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-2.5 pt-2">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    المزايا والصلاحيات:
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                        <div
                          className={`mt-0.5 p-0.5 rounded-full ${
                            plan.id === 'vip'
                              ? 'bg-amber-950 text-amber-400'
                              : plan.id === 'pro'
                              ? 'bg-purple-950 text-purple-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                {plan.id === 'free' ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-zinc-800/80 text-zinc-400 text-xs font-semibold cursor-default"
                  >
                    {isCurrent ? 'خطة العضوية الحالية' : 'متاحة مجانًا للجميع'}
                  </button>
                ) : isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold cursor-default flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>أنت مشترك بالفعل في هذه الباقة</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentMember) {
                        onOpenLogin();
                      } else {
                        onSelectPlan(plan, billingCycle);
                      }
                    }}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                      plan.id === 'vip'
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.35)]'
                    }`}
                  >
                    <span>{currentMember ? `ترقية إلى ${plan.name}` : 'سجل واشترك الآن'}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Security & Methods Strip */}
      <div className="bg-[#0e1019] border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>دفع آمن ومدعوم وموثوق 100% في جمهورية مصر العربية</span>
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              يتم تحويل الاشتراكات مباشرة عبر المحافظ الذكية وإنستاباي مع تفعيل فوري فور المراجعة
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#131622] px-3.5 py-2 rounded-xl border border-zinc-800">
              <Smartphone className="w-4 h-4 text-rose-400" />
              <div className="text-right">
                <div className="text-[11px] font-bold text-zinc-200">فودافون كاش ومحافظ المحمول</div>
                <div className="text-[9px] text-zinc-500">{PLATFORM_PAYMENT_INFO.vodafoneCash.number}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#131622] px-3.5 py-2 rounded-xl border border-zinc-800">
              <Zap className="w-4 h-4 text-purple-400" />
              <div className="text-right">
                <div className="text-[11px] font-bold text-zinc-200">إنستاباي (InstaPay)</div>
                <div className="text-[9px] text-zinc-500">{PLATFORM_PAYMENT_INFO.instaPay.address}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-[#10121a] border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-2 text-purple-400">
          <HelpCircle className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">الأسئلة الشائعة حول اشتراكات المنصة</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#0b0c12] p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
            <h5 className="font-bold text-zinc-200">كيف يتم تفعيل الاشتراك بعد التحويل؟</h5>
            <p className="text-zinc-400 leading-relaxed">
              بمجرد تحويل المبلغ عبر فودافون كاش أو إنستاباي وإرسال رقم المحفظة المحوّل منها، تقوم إدارة المنصة بالتحقق وتفعيل شارة وباقة حسابك خلال دقائق معدودة.
            </p>
          </div>

          <div className="bg-[#0b0c12] p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
            <h5 className="font-bold text-zinc-200">هل تأخذ المنصة عمولة على الخدمات والتجارب؟</h5>
            <p className="text-zinc-400 leading-relaxed">
              لا تأخذ المنصة أي نسبة مئوية على أتعابك أو مقابل تجاربك في باقتي Pro و VIP. المعاملات تتم يداً بيد أو مباشرة بينك وبين العضو الطالب.
            </p>
          </div>

          <div className="bg-[#0b0c12] p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
            <h5 className="font-bold text-zinc-200">هل يمكنني الترقية من Pro إلى VIP في أي وقت؟</h5>
            <p className="text-zinc-400 leading-relaxed">
              نعم، يمكنك الترقية في أي وقت وستتم إضافة مدة الاشتراك وتفعيل الشارة الذهبية فوراً.
            </p>
          </div>

          <div className="bg-[#0b0c12] p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
            <h5 className="font-bold text-zinc-200">ما هي ميزة شارة التوثيق (Verified Badge)؟</h5>
            <p className="text-zinc-400 leading-relaxed">
              تعطي الشارة ثقة ومصداقية مضاعفة للأعضاء الآخرين، مما يرفع من معدل طلب تجاربك وخدماتك بنسبة تفوق 300%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Check, Copy, CheckCircle2, Smartphone, ShieldCheck, Crown, Zap } from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { PLATFORM_PAYMENT_INFO } from '../data/plans';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlan | null;
  billingCycle: 'monthly' | 'annual';
  memberName: string;
  memberContact: string;
  onSubmitSubscription: (payload: {
    plan: 'pro' | 'vip';
    billingCycle: 'monthly' | 'annual';
    amount: number;
    paymentMethod: 'vodafone_cash' | 'instapay';
    paymentSenderInfo: string;
    transactionRef: string;
  }) => Promise<void>;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
  billingCycle,
  memberName,
  memberContact,
  onSubmitSubscription,
}) => {
  if (!isOpen || !selectedPlan || selectedPlan.id === 'free') return null;

  const [paymentMethod, setPaymentMethod] = useState<'vodafone_cash' | 'instapay'>('vodafone_cash');
  const [senderInfo, setSenderInfo] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amount = billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!senderInfo.trim()) {
      setErrorMessage(
        paymentMethod === 'vodafone_cash'
          ? 'يرجى إدخال رقم المحفظة المحوّل منها لتأكيد العملية'
          : 'يرجى إدخال معرّف أو رقم إنستاباي المحوّل منه'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitSubscription({
        plan: selectedPlan.id as 'pro' | 'vip',
        billingCycle,
        amount,
        paymentMethod,
        paymentSenderInfo: senderInfo.trim(),
        transactionRef: transactionRef.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('حدث خطأ أثناء إرسال طلب الاشتراك، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#12141f] border border-zinc-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-right">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-[#12141f]">
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5 justify-end">
                <span>تأكيد الاشتراك في {selectedPlan.name}</span>
                <Crown className={`w-4 h-4 ${selectedPlan.id === 'vip' ? 'text-amber-400' : 'text-purple-400'}`} />
              </h3>
              <p className="text-xs text-zinc-400">
                {billingCycle === 'annual' ? 'دورة سنوية / مخفضة' : 'دورة اشتراك شهرية'} • المبلغ المستحق:{' '}
                <strong className="text-purple-300 font-bold">{amount} ج.م</strong>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Plan Summary Tag */}
          <div className="bg-[#0b0d14] p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  selectedPlan.id === 'vip'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    : 'bg-purple-950/80 text-purple-300 border border-purple-800'
                }`}
              >
                {selectedPlan.badge}
              </span>
              <span className="text-xs text-zinc-400">
                المشترك: <strong className="text-zinc-200">{memberName || 'عضو رفيق'}</strong>
              </span>
            </div>
            <div className="text-left">
              <div className="text-lg font-black text-white">{amount} ج.م</div>
              <div className="text-[10px] text-zinc-500">شامل كافة المزايا والصلاحيات</div>
            </div>
          </div>

          {/* Payment Method Selector (Egyptian Local Methods) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300">
              اختر طريقة الدفع المناسبة لك في مصر:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('vodafone_cash')}
                className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  paymentMethod === 'vodafone_cash'
                    ? 'bg-rose-950/40 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                    : 'bg-[#0e1017] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <Smartphone className="w-4 h-4 text-rose-400" />
                </div>
                <div className="mt-2 font-bold text-xs">فودافون كاش ومحافظ المحمول</div>
                <div className="text-[10px] text-zinc-400">فودافون / أورنج / إتصالات / وي</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('instapay')}
                className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  paymentMethod === 'instapay'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.25)]'
                    : 'bg-[#0e1017] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div className="mt-2 font-bold text-xs">إنستاباي (InstaPay)</div>
                <div className="text-[10px] text-zinc-400">تحويل بنكي لحظي فوري</div>
              </button>
            </div>
          </div>

          {/* Payment Details Box with 1-Click Copy */}
          <div className="bg-[#090a0f] p-4 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">بيانات تحويل الاشتراك الرسمية:</span>
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>حساب موثق ومعتمد</span>
              </span>
            </div>

            {paymentMethod === 'vodafone_cash' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-900/90 p-3 rounded-xl border border-zinc-700">
                  <button
                    type="button"
                    onClick={() => handleCopy(PLATFORM_PAYMENT_INFO.vodafoneCash.number, 'vodafone')}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors"
                  >
                    {copiedKey === 'vodafone' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'vodafone' ? 'تم النسخ' : 'نسخ الرقم'}</span>
                  </button>
                  <div className="text-left">
                    <span className="text-base font-black font-mono text-rose-400">
                      {PLATFORM_PAYMENT_INFO.vodafoneCash.number}
                    </span>
                    <div className="text-[10px] text-zinc-400">{PLATFORM_PAYMENT_INFO.vodafoneCash.name}</div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  💡 {PLATFORM_PAYMENT_INFO.vodafoneCash.instructions}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-900/90 p-3 rounded-xl border border-zinc-700">
                  <button
                    type="button"
                    onClick={() => handleCopy(PLATFORM_PAYMENT_INFO.instaPay.address, 'instapay')}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 transition-colors"
                  >
                    {copiedKey === 'instapay' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'instapay' ? 'تم النسخ' : 'نسخ المعرف'}</span>
                  </button>
                  <div className="text-left">
                    <span className="text-sm font-black font-mono text-purple-400">
                      {PLATFORM_PAYMENT_INFO.instaPay.address}
                    </span>
                    <div className="text-[10px] text-zinc-400">{PLATFORM_PAYMENT_INFO.instaPay.name}</div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  💡 {PLATFORM_PAYMENT_INFO.instaPay.instructions}
                </p>
              </div>
            )}
          </div>

          {/* Transfer Proof Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {paymentMethod === 'vodafone_cash' ? 'رقم المحفظة التي قمت بالتحويل منها' : 'معرّف أو رقم إنستاباي المحوّل منه'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={
                  paymentMethod === 'vodafone_cash'
                    ? 'مثال: 010xxxxxxxx أو 011xxxxxxxx'
                    : 'مثال: username@instapay أو رقم الهاتف'
                }
                value={senderInfo}
                onChange={(e) => setSenderInfo(e.target.value)}
                className="w-full bg-[#090a0f] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 text-left font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                رقم العملية / مرجع التحويل (اختياري لسرعة التأكيد)
              </label>
              <input
                type="text"
                placeholder="مثال: رقم المعاملة من رسالة فودافون أو إشعار إنستاباي"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full bg-[#090a0f] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 text-left font-mono"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>جاري إرسال طلب التفعيل...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد التحويل وطلب التفعيل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

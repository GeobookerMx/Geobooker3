// src/pages/en/PricingPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import { Check, X, Star, Zap, Crown, ArrowRight, HelpCircle } from 'lucide-react';

/**
 * English Pricing Page for international advertisers
 * SEO keywords: "geobooker pricing", "advertise Mexico cost",
 * "local business directory pricing"
 */
const PricingPage = () => {
    const [billingPeriod, setBillingPeriod] = useState('monthly');

    const plans = [
        {
            name: 'Free',
            icon: <Star className="w-6 h-6" />,
            price: { monthly: 0, annual: 0 },
            currency: 'USD',
            description: 'Perfect for getting started',
            features: [
                { text: 'Register up to 2 businesses', included: true },
                { text: 'Basic business profile', included: true },
                { text: 'Map listing', included: true },
                { text: 'Customer reviews', included: true },
                { text: 'Advertising', included: false },
                { text: 'Analytics dashboard', included: false },
                { text: 'Priority support', included: false }
            ],
            cta: 'Get Started Free',
            ctaLink: '/signup',
            popular: false,
            gradient: 'from-gray-50 to-gray-100'
        },
        {
            name: 'Business',
            icon: <Zap className="w-6 h-6" />,
            price: { monthly: 25, annual: 240 },
            originalPrice: { monthly: 83, annual: 800 },
            currency: 'USD',
            description: 'Ideal for local businesses',
            features: [
                { text: 'Everything in Free', included: true },
                { text: 'Sponsored search results', included: true },
                { text: 'Real-time analytics dashboard', included: true },
                { text: 'Category targeting', included: true },
                { text: 'City-level geo-targeting', included: true },
                { text: 'Email support', included: true },
                { text: 'Account manager', included: false }
            ],
            cta: 'Start With 70% Off',
            ctaLink: '/advertise',
            popular: true,
            gradient: 'from-blue-50 to-indigo-50'
        },
        {
            name: 'Enterprise',
            icon: <Crown className="w-6 h-6" />,
            price: { monthly: null, annual: null },
            currency: 'USD',
            description: 'For brands & agencies',
            features: [
                { text: 'Everything in Business', included: true },
                { text: 'All ad formats (banners, interstitials)', included: true },
                { text: 'Multi-city campaigns', included: true },
                { text: 'Multilingual ad creatives', included: true },
                { text: 'Dedicated account manager', included: true },
                { text: 'Weekly performance reports', included: true },
                { text: 'Custom integrations', included: true }
            ],
            cta: 'Contact Sales',
            ctaLink: '/enterprise/contact',
            popular: false,
            gradient: 'from-purple-50 to-pink-50'
        }
    ];

    const faqItems = [
        {
            q: 'What payment methods do you accept?',
            a: 'We accept credit/debit cards (Visa, Mastercard, Amex), bank transfers, and OXXO cash payments (Mexico only). All payments include a fiscal invoice.'
        },
        {
            q: 'Can I cancel anytime?',
            a: 'Yes, all plans are month-to-month with no long-term contracts. Cancel anytime from your dashboard.'
        },
        {
            q: 'Do you offer refunds?',
            a: 'We offer a 7-day money-back guarantee for new advertisers. If you\'re not satisfied, contact us for a full refund.'
        },
        {
            q: 'What currencies can I pay in?',
            a: 'Prices are shown in USD for reference. We bill in MXN (Mexican Pesos) at the current exchange rate. Enterprise plans can be billed in USD or EUR.'
        }
    ];

    return (
        <>
            <SEO
                title="Pricing — Geobooker Advertising Plans"
                description="See Geobooker advertising plans and pricing. Free business listing, sponsored results from $25/mo, and enterprise packages for brands. 70% launch discount available."
            />

            <div className="min-h-screen bg-white">
                {/* Header */}
                <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <span className="inline-block px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
                            🎉 70% Launch Discount on All Plans
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Simple, Transparent Pricing
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Start for free, upgrade when you're ready. No hidden fees, no surprises.
                        </p>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center gap-3 mt-8">
                            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>
                                Monthly
                            </span>
                            <button
                                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                                className={`relative w-14 h-7 rounded-full transition-colors ${billingPeriod === 'annual' ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                            >
                                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${billingPeriod === 'annual' ? 'translate-x-7' : 'translate-x-0.5'
                                    }`} />
                            </button>
                            <span className={`text-sm font-medium ${billingPeriod === 'annual' ? 'text-gray-900' : 'text-gray-400'}`}>
                                Annual <span className="text-green-600 font-bold">Save 20%</span>
                            </span>
                        </div>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="max-w-6xl mx-auto px-4 -mt-4 pb-20">
                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan, i) => (
                            <div
                                key={i}
                                className={`relative bg-gradient-to-br ${plan.gradient} rounded-2xl p-8 border-2 ${plan.popular ? 'border-blue-500 shadow-xl shadow-blue-500/10' : 'border-gray-200'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-bold rounded-full">
                                        Most Popular
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                        {plan.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                </div>

                                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                                <div className="mb-6">
                                    {plan.price[billingPeriod] !== null ? (
                                        <>
                                            {plan.originalPrice && (
                                                <span className="text-lg text-gray-400 line-through mr-2">
                                                    ${plan.originalPrice[billingPeriod]}
                                                </span>
                                            )}
                                            <span className="text-4xl font-bold text-gray-900">
                                                ${plan.price[billingPeriod]}
                                            </span>
                                            <span className="text-gray-500 ml-1">
                                                /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-2xl font-bold text-gray-900">Custom</span>
                                    )}
                                </div>

                                <Link
                                    to={plan.ctaLink}
                                    className={`block w-full text-center py-3 rounded-xl font-bold transition ${plan.popular
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>

                                <ul className="mt-6 space-y-3">
                                    {plan.features.map((f, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm">
                                            {f.included ? (
                                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            ) : (
                                                <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                            )}
                                            <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>
                                                {f.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pricing FAQ */}
                <section className="bg-gray-50 py-16 px-4">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
                            Pricing FAQ
                        </h2>
                        <div className="space-y-4">
                            {faqItems.map((item, i) => (
                                <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4 text-blue-500" />
                                        {item.q}
                                    </h3>
                                    <p className="text-gray-600 text-sm">{item.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default PricingPage;

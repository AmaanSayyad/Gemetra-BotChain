import { Button } from "../ui/components/Button";
import { IconWithBackground } from "../ui/components/IconWithBackground";
import EnhancedNavbar from "../ui/components/EnhancedNavbar";
import EnhancedFooter from "../ui/components/EnhancedFooter";
import Squares from "./Squares";
import {
  Clock,
  DollarSign,
  Globe,
  Shield,
  Bot,
  Wallet,
  ArrowRight,
  Play
} from 'lucide-react';
import ConnectButton from "../utils/connect-wallet";
function GemetraLandingPage() {
  return (
    <div className="flex min-h-0 min-w-0 h-full w-full max-w-[100vw] flex-col items-start overflow-x-hidden bg-default-background">
      {/* Navigation - Fixed position navbar */}
      <EnhancedNavbar transparent={true} />

      {/* Hero Section - First visible section with padding for navbar */}
      <div
        id="home"
        className="relative flex w-full min-w-0 flex-col items-center justify-center gap-8 px-4 pb-16 pt-28 sm:gap-10 sm:px-6 sm:pb-24 sm:pt-36 lg:gap-12 lg:py-32 lg:pt-40 overflow-hidden"
      >
        {/* Squares Background */}
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor="#f1f1f1"
          hoverFillColor="#F1F1F1"
        />

        {/* Animated Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-brand-50/10 to-transparent animate-pulse-slow z-0"></div>

        {/* Content */}
        <div className="z-10 flex w-full min-w-0 max-w-full flex-col items-center justify-center gap-5 sm:gap-7">
          <div className="mb-1 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full bg-brand-50 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2">
            <img
              src="/botchain.png"
              alt="BOT Chain logo"
              className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5"
            />
            <span className="font-['Montserrat'] text-xs font-[700] text-brand-800 sm:text-[14px]">Built on BOT CHAIN MAINNET</span>
            <img
              src="/usdt.png"
              alt="USDT logo"
              className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5"
            />
            <span className="font-['Montserrat'] text-xs font-[700] text-brand-800 sm:text-[14px]">Powered by USDT</span>
          </div>
          <span className="w-full min-w-0 max-w-[1024px] px-1 text-center font-['Montserrat'] font-[900] leading-[1.08] tracking-tight text-brand-800 text-[clamp(1.75rem,calc(0.85rem+4.2vw),6rem)] sm:leading-[1.04]">
            {"Global Remittance"} <br />
            <span className="bg-gradient-to-r from-brand-800 to-brand-600 bg-clip-text text-transparent">
              Infrastructure
            </span>
          </span>

          <span className="w-full min-w-0 max-w-[40rem] px-1 text-center font-['Montserrat'] text-[15px] font-[600] leading-[1.45] text-brand-800 sm:text-[17px] sm:leading-[1.5] md:text-[20px] md:leading-[30px]">
            {
              "Borderless payments infrastructure built on BOT Chain with USDT unifying VAT refunds and global payroll automation. Trustless, transparent, and programmable money with AI-driven financial intelligence."
            }
          </span>
        </div>
        <div className="z-10 flex w-full min-w-0 flex-wrap items-center justify-center gap-3 sm:gap-6">
          <Button
            size="large"
            variant="primary"
            onClick={() =>
              document.getElementById("features-section")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            icon={<ArrowRight size={20} />}
            className="px-8 py-6 bg-brand-600 hover:bg-brand-700 text-white transition-all duration-300"
          >
            Explore Platform
          </Button>
          <Button
            size="large"
            variant="neutral-secondary"
            onClick={() => window.open('https://youtu.be/j9PxVo5DRxE', '_blank')}
            icon={<Play size={20} />}
            className="px-8 py-6 hover:bg-brand-50 transition-all duration-300"
          >
            Watch Demo
          </Button>
          <ConnectButton />
        </div>

        {/* Stats Bar */}
        <div className="z-10 mt-8 flex w-full min-w-0 max-w-[1024px] flex-wrap justify-center gap-x-8 gap-y-6 sm:mt-12 sm:gap-x-12">
          <div className="flex min-w-[5.5rem] flex-col items-center">
            <span className="font-['Montserrat'] text-2xl font-[900] text-brand-800 sm:text-4xl">&lt;1s</span>
            <span className="font-['Montserrat'] text-xs font-[600] text-brand-600 sm:text-[14px]">BOT Chain Finality</span>
          </div>
          <div className="flex min-w-[5.5rem] flex-col items-center">
            <span className="font-['Montserrat'] text-2xl font-[900] text-brand-800 sm:text-4xl">5</span>
            <span className="font-['Montserrat'] text-xs font-[600] text-brand-600 sm:text-[14px]">Live Chains</span>
          </div>
          <div className="flex min-w-[5.5rem] flex-col items-center">
            <span className="font-['Montserrat'] text-2xl font-[900] text-brand-800 sm:text-4xl">1:1</span>
            <span className="font-['Montserrat'] text-xs font-[600] text-brand-600 sm:text-[14px]">Reserve Backing</span>
          </div>
          <div className="flex min-w-[5.5rem] flex-col items-center">
            <span className="font-['Montserrat'] text-2xl font-[900] text-brand-800 sm:text-4xl">24/7</span>
            <span className="font-['Montserrat'] text-xs font-[600] text-brand-600 sm:text-[14px]">Settlement</span>
          </div>
        </div>
      </div>

      {/* Core Components Section */}
      <div
        id="features-section"
        className="relative flex w-full min-w-0 flex-col items-center justify-center gap-12 overflow-hidden bg-default-background px-4 py-20 sm:gap-16 sm:px-6 sm:py-28 lg:py-32"
      >
        {/* Squares Background */}
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor="#f1f1f1"
          hoverFillColor="#F1F1F1"
        />

        {/* Animated Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-brand-50/10 to-transparent animate-pulse-slow z-0"></div>

        <div className="relative z-10 flex w-full min-w-0 max-w-[1280px] flex-col items-center gap-3 sm:gap-4">
          <span className="inline-block px-4 py-1 bg-brand-50 rounded-full mb-2">
            <span className="font-['Montserrat'] text-[12px] font-[700] text-brand-800">POWERED BY</span>
          </span>
          <span className="w-full min-w-0 px-2 text-center font-['Montserrat'] font-[800] leading-tight tracking-tight text-default-font text-[clamp(1.5rem,calc(1rem+3.5vw),3rem)] sm:leading-[1.1]">
            Core Technology Stack
          </span>
          <p className="max-w-[40rem] px-2 text-center font-['Montserrat'] text-[15px] leading-relaxed text-subtext-color sm:text-[17px] sm:leading-[26px] md:text-[18px] md:leading-[28px]">
            Our infrastructure combines blockchain reliability with AI intelligence to deliver a seamless financial experience
          </p>
        </div>

        <div className="w-full max-w-[1280px] grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {/* Blockchain Layer */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
                <img
                  className="h-8 object-cover"
                  src="/botchain.png"
                  alt="BOT Chain logo"
                />
              </div>
              <h3 className="font-['Montserrat'] text-[24px] font-[700]">Blockchain Layer</h3>
            </div>
            <p className="text-subtext-color font-['Montserrat'] text-[16px] leading-[24px]">
              Built on BOT Chain with USDT for programmable money, secure transactions, and transparent payroll automation.
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">BOT Chain Mainnet</span>
              <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">USDT</span>
              <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">ERC-20 Token Standard</span>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <img
                className="h-8 w-8 object-contain"
                src="/botchain.png"
                alt="BOT Chain logo"
              />
              <img
                className="h-8 w-8 object-contain"
                src="/usdt.png"
                alt="USDT logo"
              />
            </div>
          </div>

          {/* AI Intelligence Layer */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                <img
                  className="h-8 w-8 object-contain rounded-full"
                  src="/ai_logo.png"
                  alt="AI Intelligence logo"
                />
              </div>
              <h3 className="font-['Montserrat'] text-[24px] font-[700]">AI Intelligence</h3>
            </div>
            <p className="text-subtext-color font-['Montserrat'] text-[16px] leading-[24px]">
              AI-guided workflows for VAT, payroll, and compliance summaries—grounded in your synced company data—with Google Gemini powering natural-language answers tuned to BOT Chain + USDT payouts.
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">Tax Compliance</span>
              <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">Automated Parsing</span>
              <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">Smart Reasoning</span>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <img
                  className="h-8 w-8 object-contain"
                  src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg"
                  alt="Google Gemini logo"
                  onError={(e) => {
                    // Fallback to sparkle emoji if image fails
                    e.currentTarget.outerHTML = '<span class="text-xl">✨</span>';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Data & Storage Layer */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
                <img
                  className="h-8 object-contain"
                  alt="Supabase logo"
                  src="/supabase.webp"
                />
              </div>
              <h3 className="font-['Montserrat'] text-[24px] font-[700]">Data & Storage</h3>
            </div>
            <p className="text-subtext-color font-['Montserrat'] text-[16px] leading-[24px]">
              Secure persistence for receipts, payruns, claims metadata, KYC profiles, and audit logs with Supabase backend and Oracle integration.
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">Audit Logs</span>
              <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">KYC Profiles</span>
              <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">Oracle Layer</span>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <img
                className="h-8 object-contain"
                alt="Supabase logo"
                src="/supabase.webp"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Feature Section */}
      <div className="flex w-full flex-col items-center justify-center gap-16 bg-default-background px-6 py-32 relative overflow-hidden">
        {/* Squares Background */}
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor="#f1f1f1"
          hoverFillColor="#F1F1F1"
        />

        {/* Animated Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-brand-50/10 to-transparent animate-pulse-slow z-0"></div>

        <div className="flex w-full max-w-[1280px] flex-col items-center gap-6 relative z-10">
          <span className="inline-block px-4 py-1 bg-brand-50 rounded-full">
            <span className="font-['Montserrat'] text-[12px] font-[700] text-brand-800">UNIFIED PLATFORM</span>
          </span>
          <span className="w-full max-w-[768px] font-['Montserrat'] text-[50px] font-[800] leading-[56px] text-brand-900 text-center -tracking-[0.025em]">
            Unifying Two Critical Financial Workflows
          </span>
          <p className="max-w-[768px] text-center text-subtext-color font-['Montserrat'] text-[18px] leading-[28px]">
            A single borderless payments infrastructure that solves both VAT refund inefficiencies and global payroll complexity
          </p>
        </div>

        <div className="w-full max-w-[1280px] flex flex-col gap-12 relative z-10">
          {/* Main Feature Card */}
          <div className="flex flex-col md:flex-row min-h-[500px] w-full rounded-[32px] bg-neutral-100 overflow-hidden shadow-xl">
            <div className="flex-1 relative overflow-hidden">
              <img
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80"
                alt="Global remittance"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-brand-900/70 to-transparent flex items-center justify-center p-8">
                <div className="text-white max-w-[400px]">
                  <h3 className="font-['Montserrat'] text-[32px] font-[800] mb-4">Borderless Payments</h3>
                  <p className="font-['Montserrat'] text-[16px] leading-[24px] mb-6">
                    Gemetra's infrastructure eliminates geographical barriers, enabling instant cross-border transactions with minimal fees.
                  </p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white">5 Live Chains</span>
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white">Instant Transfers</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-start justify-center gap-8 p-12">
              <div className="flex flex-col items-start justify-center gap-6">
                <span className="font-['Montserrat'] text-[30px] font-[700] leading-[34px] text-default-font -tracking-[0.025em]">
                  Borderless Payments Infrastructure
                </span>
                <span className="whitespace-pre-wrap font-['Montserrat'] text-[18px] font-[400] leading-[26px] text-subtext-color -tracking-[0.01em]">
                  {
                    "Gemetra unifies VAT refunds for tourists and global payroll automation on a single trustless platform. Powered by BOT Chain and USDT for programmable money and AI-driven compliance."
                  }
                </span>

                <div className="grid grid-cols-2 gap-4 w-full mt-4">
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-2">
                      <IconWithBackground size="small" variant="brand" icon={<Globe />} />
                      <span className="font-['Montserrat'] text-[14px] font-[600] leading-[20px] text-default-font">
                        VAT REFUNDS
                      </span>
                    </div>
                    <p className="text-sm text-subtext-color">Instant tax refunds for tourists with near-zero fees</p>
                  </div>

                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-2">
                      <IconWithBackground size="small" variant="brand" icon={<Wallet />} />
                      <span className="font-['Montserrat'] text-[14px] font-[600] leading-[20px] text-default-font">
                        GLOBAL PAYROLL
                      </span>
                    </div>
                    <p className="text-sm text-subtext-color">Automated salary disbursements across jurisdictions</p>
                  </div>

                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-2">
                      <IconWithBackground size="small" variant="brand" icon={<Clock />} />
                      <span className="font-['Montserrat'] text-[14px] font-[600] leading-[20px] text-default-font">
                        &lt;1s SETTLEMENT
                      </span>
                    </div>
                    <p className="text-sm text-subtext-color">Instant confirmations globally, no waiting</p>
                  </div>

                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-2">
                      <IconWithBackground size="small" variant="brand" icon={<Bot />} />
                      <span className="font-['Montserrat'] text-[14px] font-[600] leading-[20px] text-default-font">
                        AI COMPLIANCE
                      </span>
                    </div>
                    <p className="text-sm text-subtext-color">Automated regulatory compliance across borders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Key Benefits Section */}
      <div id="benefits-section" className="flex w-full flex-col items-center justify-center gap-16 bg-default-background px-6 py-32 relative overflow-hidden">
        {/* Squares Background */}
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor="#f1f1f1"
          hoverFillColor="#F1F1F1"
        />

        {/* Animated Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-brand-50/10 to-transparent animate-pulse-slow z-0"></div>

        <div className="flex w-full max-w-[1280px] flex-col items-center gap-6 relative z-10">
          <span className="inline-block px-4 py-1 bg-brand-50 rounded-full">
            <span className="font-['Montserrat'] text-[12px] font-[700] text-brand-800">WHY GEMETRA</span>
          </span>
          <span className="w-full max-w-[768px] font-['Montserrat'] text-[48px] font-[800] leading-[52px] text-default-font text-center -tracking-[0.02em]">
            Trustless, Transparent, and Automated Remittance
          </span>
          <p className="max-w-[768px] text-center text-subtext-color font-['Montserrat'] text-[18px] leading-[28px]">
            Our blockchain-based infrastructure combines speed, security, and intelligence to revolutionize global financial workflows
          </p>
        </div>

        <div className="w-full max-w-[1280px] flex flex-col gap-12 relative z-10">
          {/* Main Benefits Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 4-Second Finality */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="h-48 bg-brand-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620228885847-9eab2a1adddc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-30"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Clock size={48} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">&lt;1 SECOND</span>
                  <span className="px-3 py-1 bg-green-50 rounded-full text-sm font-medium text-green-700">INSTANT CONFIRMATIONS</span>
                </div>
                <h3 className="font-['Montserrat'] text-[28px] font-[800] mb-4 text-default-font group-hover:text-brand-800 transition-colors">
                  Instant Settlement
                </h3>
                <p className="text-subtext-color font-['Montserrat'] text-[16px] leading-[24px] mb-6">
                  Experience secure and transparent VAT refunds and payroll transactions with BOT Chain and USDT. Settlement is always-on with near-instant confirmations.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-1">
                      <span className="text-green-700 text-xs">✓</span>
                    </div>
                    <span className="text-default-font">No flight delays for tourists awaiting VAT refunds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-1">
                      <span className="text-green-700 text-xs">✓</span>
                    </div>
                    <span className="text-default-font">Eliminate payroll processing lag times</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-1">
                      <span className="text-green-700 text-xs">✓</span>
                    </div>
                    <span className="text-default-font">Immediate confirmation of transaction success</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Ultra-Low Fees */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="h-48 bg-brand-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526304760382-3591d3840148?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-30"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <DollarSign size={48} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">&lt;1¢</span>
                  <span className="px-3 py-1 bg-green-50 rounded-full text-sm font-medium text-green-700">FULLY BACKED & REGULATED</span>
                </div>
                <h3 className="font-['Montserrat'] text-[28px] font-[800] mb-4 text-default-font group-hover:text-brand-800 transition-colors">
                  Ultra-Low Transaction Fees
                </h3>
                <p className="text-subtext-color font-['Montserrat'] text-[16px] leading-[24px] mb-6">
                  Transaction cost remains a fraction of a cent on modern rails. USDT is designed as a non-freezable digital dollar with transparent reserve disclosures and multi-chain operability.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-1">
                      <span className="text-green-700 text-xs">✓</span>
                    </div>
                    <span className="text-default-font">Fraction of traditional banking fees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-1">
                      <span className="text-green-700 text-xs">✓</span>
                    </div>
                    <span className="text-default-font">No hidden charges or intermediary costs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-1">
                      <span className="text-green-700 text-xs">✓</span>
                    </div>
                    <span className="text-default-font">Cost-effective for businesses of all sizes</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* AI Intelligence */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="h-48 bg-brand-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1677442135968-8d288c3b6014?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-30"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Bot size={48} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-brand-50 rounded-full text-sm font-medium text-brand-800">AI POWERED</span>
                  <span className="px-3 py-1 bg-green-50 rounded-full text-sm font-medium text-green-700">MULTI-JURISDICTION</span>
                </div>
                <h3 className="font-['Montserrat'] text-[28px] font-[800] mb-4 text-default-font group-hover:text-brand-800 transition-colors">
                  AI-Driven Intelligence
                </h3>
                <p className="text-subtext-color font-['Montserrat'] text-[16px] leading-[24px] mb-6">
                  Advanced AI-driven compliance reasoning for tax rules, VAT validation, and payroll automation across multiple jurisdictions.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-1">
                      <span className="text-green-700 text-xs">✓</span>
                    </div>
                    <span className="text-default-font">Automated tax compliance across borders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-1">
                      <span className="text-green-700 text-xs">✓</span>
                    </div>
                    <span className="text-default-font">Smart contract validation and enforcement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-1">
                      <span className="text-green-700 text-xs">✓</span>
                    </div>
                    <span className="text-default-font">Continuous learning from transaction patterns</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Additional Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                <Shield size={32} className="text-brand-800" />
              </div>
              <div>
                <h3 className="font-['Montserrat'] text-[20px] font-[700] mb-2">Military-Grade Security</h3>
                <p className="text-subtext-color">Multi-sig treasury and oracle signature verification protect all transactions with enterprise-level security</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                <Globe size={32} className="text-brand-800" />
              </div>
              <div>
                <h3 className="font-['Montserrat'] text-[20px] font-[700] mb-2">Global Reach</h3>
                <p className="text-subtext-color">Native support across 5 live chains with transparent reserve-aware settlement infrastructure</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="flex w-full flex-col items-center justify-center gap-16 bg-default-background px-6 py-32 relative overflow-hidden">
        {/* Squares Background */}
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor="#f1f1f1"
          hoverFillColor="#F1F1F1"
        />

        {/* Animated Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-brand-50/10 to-transparent animate-pulse-slow z-0"></div>

        <div className="flex w-full max-w-[1280px] flex-col items-center gap-6 relative z-10">
          <span className="inline-block px-4 py-1 bg-brand-50 rounded-full">
            <span className="font-['Montserrat'] text-[12px] font-[700] text-brand-800">USE CASES</span>
          </span>
          <span className="w-full max-w-[768px] font-['Montserrat'] text-[48px] font-[800] leading-[52px] text-brand-900 text-center -tracking-[0.02em]">
            Real-World Applications
          </span>
          <p className="max-w-[768px] text-center text-subtext-color font-['Montserrat'] text-[18px] leading-[28px]">
            Gemetra combines VAT refunds for tourists and global payroll automation into a single borderless payments infrastructure with Web3 speed and AI-driven intelligence
          </p>
        </div>

        <div className="w-full max-w-[1280px] relative z-10">
          {/* VAT Refunds Use Case */}
          <div className="flex flex-col md:flex-row bg-white rounded-3xl overflow-hidden shadow-xl mb-12">
            <div className="md:w-1/2 bg-brand-900 p-12 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-700 rounded-bl-full opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-800 rounded-tr-full opacity-30"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full mb-6">
                  <ArrowRight size={16} className="text-white" />
                  <span className="font-['Montserrat'] text-[12px] font-[700] text-white">USE CASE 1</span>
                </div>

                <h2 className="font-['Montserrat'] text-[40px] font-[800] text-white mb-6">VAT Refunds</h2>

                <p className="text-white/90 font-['Montserrat'] text-[18px] leading-[28px] mb-8">
                  Streamline VAT refunds for tourists leaving Dubai and other jurisdictions, solving delays, missed claims, and inefficiencies in reclaiming tax with near-instant blockchain payouts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-['Montserrat'] text-[18px] font-[700] text-white mb-2">Tourist Experience</h3>
                    <p className="text-white/80 text-sm">Tourists scan their VAT tag at airport kiosks and receive refunds directly to their wallet within seconds</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-['Montserrat'] text-[18px] font-[700] text-white mb-2">Retailer Benefits</h3>
                    <p className="text-white/80 text-sm">Retailers issue digital tags with minimal overhead and attract more tax-conscious international shoppers</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-white/90">85-87% refund rate (vs. 60-70% traditional)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-white/90">No queues or paperwork at the airport</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-white/90">90-day validation window</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-1/2 p-8 md:p-12 flex flex-col">
              <div className="mb-8">
                <h3 className="font-['Montserrat'] text-[24px] font-[700] text-brand-900 mb-4">How It Works</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="font-['Montserrat'] font-bold text-brand-800">1</span>
                    </div>
                    <div>
                      <h4 className="font-['Montserrat'] text-[18px] font-[600] text-default-font">Purchase & Tagging</h4>
                      <p className="text-subtext-color">Retailer issues invoice + tax-free tag. Tourist wallet signs an ApplicationCall to Gemetra's VAT Contract.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="font-['Montserrat'] font-bold text-brand-800">2</span>
                    </div>
                    <div>
                      <h4 className="font-['Montserrat'] text-[18px] font-[600] text-default-font">Airport Validation</h4>
                      <p className="text-subtext-color">Tourist scans tag at kiosk. Operator system validates goods exported and pushes a signed webhook to Gemetra Oracle.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="font-['Montserrat'] font-bold text-brand-800">3</span>
                    </div>
                    <div>
                      <h4 className="font-['Montserrat'] text-[18px] font-[600] text-default-font">On-chain Payout</h4>
                      <p className="text-subtext-color">Tourist receives USDT stablecoin with fast finality on BOT Chain and native multi-chain support.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-100">
                  <h4 className="font-['Montserrat'] text-[16px] font-[700] text-default-font mb-2">Real-World Example</h4>
                  <p className="text-subtext-color mb-4">
                    A Japanese tourist purchases a luxury watch in Dubai Mall for AED 50,000 (incl. 5% VAT = AED 2,500). Using Gemetra, they scan the VAT tag at Dubai Airport and receive AED 2,125 (85% of VAT) in USDT directly to their wallet before boarding their flight.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-50 rounded-full text-xs font-medium text-green-700">4s PAYOUT</span>
                    <span className="px-3 py-1 bg-green-50 rounded-full text-xs font-medium text-green-700">85% REFUND RATE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Global Payroll Use Case */}
          <div className="flex flex-col md:flex-row-reverse bg-white rounded-3xl overflow-hidden shadow-xl">
            <div className="md:w-1/2 bg-brand-800 p-12 relative">
              <div className="absolute top-0 left-0 w-32 h-32 bg-brand-700 rounded-br-full opacity-50"></div>
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-brand-600 rounded-tl-full opacity-30"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full mb-6">
                  <Wallet size={16} className="text-white" />
                  <span className="font-['Montserrat'] text-[12px] font-[700] text-white">USE CASE 2</span>
                </div>

                <h2 className="font-['Montserrat'] text-[40px] font-[800] text-white mb-6">Global Payroll</h2>

                <p className="text-white/90 font-['Montserrat'] text-[18px] leading-[28px] mb-8">
                  Automate payroll for distributed teams across jurisdictions, reducing transaction fees, ensuring compliance, and enabling instant on-chain salary payouts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-['Montserrat'] text-[18px] font-[700] text-white mb-2">For Companies</h3>
                    <p className="text-white/80 text-sm">Reduce payroll processing costs by 95% while ensuring regulatory compliance across multiple jurisdictions</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="font-['Montserrat'] text-[18px] font-[700] text-white mb-2">For Employees</h3>
                    <p className="text-white/80 text-sm">Receive salary payments instantly without intermediary delays or excessive transfer fees</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-white/90">Support across 5 live chains</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-white/90">Automated tax compliance</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-white/90">Bulk transfers up to 16 tx per group</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-1/2 p-8 md:p-12 flex flex-col">
              <div className="mb-8">
                <h3 className="font-['Montserrat'] text-[24px] font-[700] text-brand-900 mb-4">How It Works</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="font-['Montserrat'] font-bold text-brand-800">1</span>
                    </div>
                    <div>
                      <h4 className="font-['Montserrat'] text-[18px] font-[600] text-default-font">Payroll Preparation</h4>
                      <p className="text-subtext-color">HR uploads CSV/contracts. AI parses gross salary, deductions, tax rules by jurisdiction and produces structured transaction plan.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="font-['Montserrat'] font-bold text-brand-800">2</span>
                    </div>
                    <div>
                      <h4 className="font-['Montserrat'] text-[18px] font-[600] text-default-font">Approval & Execution</h4>
                      <p className="text-subtext-color">CFO/HR dual-approves the payrun. Planner chunks recipients into atomic groups and treasury key signs for broadcast.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="font-['Montserrat'] font-bold text-brand-800">3</span>
                    </div>
                    <div>
                      <h4 className="font-['Montserrat'] text-[18px] font-[600] text-default-font">Compliance & Reporting</h4>
                      <p className="text-subtext-color">All payouts logged on-chain with Supabase DB mirroring transaction IDs for audit. AI exports formatted reports for tax filings.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-100">
                  <h4 className="font-['Montserrat'] text-[16px] font-[700] text-default-font mb-2">Real-World Example</h4>
                  <p className="text-subtext-color mb-4">
                    A tech startup with 50 employees across 12 countries processes their monthly payroll of $250,000. Using Gemetra, they save $11,250 in fees (vs. traditional banking), ensure tax compliance across all jurisdictions, and complete all payments in under 1 minute.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-50 rounded-full text-xs font-medium text-green-700">95% FEE SAVINGS</span>
                    <span className="px-3 py-1 bg-green-50 rounded-full text-xs font-medium text-green-700">INSTANT SETTLEMENT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="about-section" className="flex w-full flex-col items-center justify-center gap-16 bg-default-background px-6 py-32 relative overflow-hidden">
        {/* Squares Background */}
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor="#f1f1f1"
          hoverFillColor="#F1F1F1"
        />

        {/* Animated Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-brand-50/10 to-transparent animate-pulse-slow z-0"></div>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        </div>

        <div className="flex w-full max-w-[1280px] flex-col items-center gap-6 relative z-10">
          <span className="inline-block px-4 py-1 bg-brand-50 rounded-full">
            <span className="font-['Montserrat'] text-[12px] font-[700] text-brand-800">HOW IT WORKS</span>
          </span>
          <span className="w-full max-w-[768px] font-['Montserrat'] text-[48px] font-[800] leading-[52px] text-default-font text-center -tracking-[0.02em]">
            Dual Workflows with Gemetra
          </span>
          <p className="max-w-[768px] text-center text-subtext-color font-['Montserrat'] text-[18px] leading-[28px]">
            Our platform handles both VAT refunds and global payroll with streamlined, automated processes built on BOT Chain and USDT
          </p>
        </div>

        {/* VAT Refund Flow */}
        <div className="w-full max-w-[1280px] z-10">
          <div className="flex flex-col gap-12">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl">
              <div className="flex flex-col gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-brand-900 flex items-center justify-center flex-shrink-0">
                    <ArrowRight size={32} className="text-white" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800 mb-2">WORKFLOW 1</span>
                    <h2 className="font-['Montserrat'] text-[32px] font-[800] text-brand-900">VAT Refund Process</h2>
                  </div>
                </div>

                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-4 top-6 bottom-6 w-1 bg-brand-100"></div>

                  <div className="space-y-12 relative">
                    {/* Step 1 */}
                    <div className="flex gap-8">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-brand-900 flex items-center justify-center z-10 relative">
                          <span className="text-white font-bold">1</span>
                        </div>
                      </div>

                      <div className="flex-1 bg-neutral-50 rounded-xl p-6 border border-neutral-100 shadow-sm">
                        <h3 className="font-['Montserrat'] text-[24px] font-[700] text-brand-900 mb-4">Purchase & Tagging</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="col-span-2">
                            <p className="text-subtext-color mb-4">
                              When a tourist makes a purchase at a participating retailer, the store issues both a standard invoice and a special tax-free tag. The tourist's wallet then signs an ApplicationCall to Gemetra's VAT Contract, opening a claim box keyed by a unique claim_id.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">CLAIM ID GENERATED</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">INVOICE HASH STORED</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">WALLET LINKED</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 shadow-inner border border-neutral-100">
                            <h4 className="font-['Montserrat'] text-[16px] font-[600] text-default-font mb-2">Stored Metadata</h4>
                            <ul className="space-y-2 text-sm text-subtext-color">
                              <li>• Tourist wallet address</li>
                              <li>• Invoice hash</li>
                              <li>• VAT amount paid</li>
                              <li>• Purchase timestamp</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-8">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-brand-900 flex items-center justify-center z-10 relative">
                          <span className="text-white font-bold">2</span>
                        </div>
                      </div>

                      <div className="flex-1 bg-neutral-50 rounded-xl p-6 border border-neutral-100 shadow-sm">
                        <h3 className="font-['Montserrat'] text-[24px] font-[700] text-brand-900 mb-4">Airport Validation</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="col-span-2">
                            <p className="text-subtext-color mb-4">
                              When departing the country, the tourist scans their tax-free tag at an airport kiosk. The operator system validates that the goods have been exported according to local regulations and then pushes a signed webhook to the Gemetra Oracle, which triggers an on-chain state update to mark the claim as VALIDATED.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">GOODS VERIFICATION</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">ORACLE SIGNATURE</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">STATE UPDATE</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 shadow-inner border border-neutral-100">
                            <h4 className="font-['Montserrat'] text-[16px] font-[600] text-default-font mb-2">Validation Rules</h4>
                            <ul className="space-y-2 text-sm text-subtext-color">
                              <li>• Goods physically exported</li>
                              <li>• Within 90 days of purchase</li>
                              <li>• Signed by authorized operator</li>
                              <li>• No duplicate claims</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-8">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-brand-900 flex items-center justify-center z-10 relative">
                          <span className="text-white font-bold">3</span>
                        </div>
                      </div>

                      <div className="flex-1 bg-neutral-50 rounded-xl p-6 border border-neutral-100 shadow-sm">
                        <h3 className="font-['Montserrat'] text-[24px] font-[700] text-brand-900 mb-4">On-chain Payout</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="col-span-2">
                            <p className="text-subtext-color mb-4">
                              Once validated, the smart contract computes the refund amount (VAT * rate - fee) and the tourist receives USDT stablecoin. The treasury disburses funds efficiently with fast finality, ensuring the tourist receives their refund before boarding their flight.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">ERC-20 / NATIVE TRANSFERS</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">FAST FINALITY</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">AUDITABILITY</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 shadow-inner border border-neutral-100">
                            <h4 className="font-['Montserrat'] text-[16px] font-[600] text-default-font mb-2">Refund Calculation</h4>
                            <ul className="space-y-2 text-sm text-subtext-color">
                              <li>• 85-87% of VAT amount</li>
                              <li>• ~AED 4.80 tag fee</li>
                              <li>• USDT stablecoin payments</li>
                              <li>• Transaction notes with claim_id</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Flow */}
        <div className="w-full max-w-[1280px] z-10">
          <div className="flex flex-col gap-12">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl">
              <div className="flex flex-col gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-brand-800 flex items-center justify-center flex-shrink-0">
                    <Wallet size={32} className="text-white" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800 mb-2">WORKFLOW 2</span>
                    <h2 className="font-['Montserrat'] text-[32px] font-[800] text-brand-900">Global Payroll Process</h2>
                  </div>
                </div>

                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-4 top-6 bottom-6 w-1 bg-brand-100"></div>

                  <div className="space-y-12 relative">
                    {/* Step 1 */}
                    <div className="flex gap-8">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center z-10 relative">
                          <span className="text-white font-bold">1</span>
                        </div>
                      </div>

                      <div className="flex-1 bg-neutral-50 rounded-xl p-6 border border-neutral-100 shadow-sm">
                        <h3 className="font-['Montserrat'] text-[24px] font-[700] text-brand-900 mb-4">Payroll Preparation</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="col-span-2">
                            <p className="text-subtext-color mb-4">
                              The HR department uploads payroll data in CSV format or through contracts into the Gemetra dashboard. The AI layer parses gross salary, deductions, and tax rules by jurisdiction, then produces a structured transaction plan with net salaries in USDT and any necessary FX conversions.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">AI PARSING</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">TAX COMPLIANCE</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">FX RATES</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 shadow-inner border border-neutral-100">
                            <h4 className="font-['Montserrat'] text-[16px] font-[600] text-default-font mb-2">AI Processing</h4>
                            <ul className="space-y-2 text-sm text-subtext-color">
                              <li>• Jurisdiction detection</li>
                              <li>• Tax rule application</li>
                              <li>• Deduction calculation</li>
                              <li>• Transaction planning</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-8">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center z-10 relative">
                          <span className="text-white font-bold">2</span>
                        </div>
                      </div>

                      <div className="flex-1 bg-neutral-50 rounded-xl p-6 border border-neutral-100 shadow-sm">
                        <h3 className="font-['Montserrat'] text-[24px] font-[700] text-brand-900 mb-4">Approval & Execution</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="col-span-2">
                            <p className="text-subtext-color mb-4">
                              The CFO and HR department must both approve the payrun to ensure security and accuracy. Once approved, a payrun_id snapshot is stored in both Supabase and on-chain as an immutable reference. The planner then processes recipients with USDT stablecoin transfers for efficient payroll distribution.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">DUAL APPROVAL</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">ATOMIC GROUPS</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">IMMUTABLE RECORD</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 shadow-inner border border-neutral-100">
                            <h4 className="font-['Montserrat'] text-[16px] font-[600] text-default-font mb-2">Security Features</h4>
                            <ul className="space-y-2 text-sm text-subtext-color">
                              <li>• Multi-sig treasury</li>
                              <li>• Safety caps per payrun</li>
                              <li>• Expiry windows</li>
                              <li>• No double execution</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-8">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center z-10 relative">
                          <span className="text-white font-bold">3</span>
                        </div>
                      </div>

                      <div className="flex-1 bg-neutral-50 rounded-xl p-6 border border-neutral-100 shadow-sm">
                        <h3 className="font-['Montserrat'] text-[24px] font-[700] text-brand-900 mb-4">Compliance & Reporting</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="col-span-2">
                            <p className="text-subtext-color mb-4">
                              All payouts are logged on-chain with transaction notes containing the payrun_id and chunk number. The Supabase database mirrors these transaction IDs for audit purposes, creating a complete record of all financial activities. The AI layer then exports formatted reports suitable for tax filings in each jurisdiction.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">ON-CHAIN LOGS</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">AUDIT TRAIL</span>
                              <span className="px-3 py-1 bg-brand-50 rounded-full text-xs font-medium text-brand-800">TAX REPORTS</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 shadow-inner border border-neutral-100">
                            <h4 className="font-['Montserrat'] text-[16px] font-[600] text-default-font mb-2">Export Formats</h4>
                            <ul className="space-y-2 text-sm text-subtext-color">
                              <li>• JSON/CSV exports</li>
                              <li>• Jurisdiction-specific formats</li>
                              <li>• Compliance documentation</li>
                              <li>• Audit-ready records</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="relative flex w-full min-w-0 flex-col items-center justify-center gap-10 overflow-hidden bg-default-background px-4 py-20 sm:gap-12 sm:px-6 sm:py-28 lg:py-32">
        {/* Squares Background */}
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor="#f1f1f1"
          hoverFillColor="#F1F1F1"
        />

        {/* Animated Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-brand-50/10 to-transparent animate-pulse-slow z-0"></div>

        <div className="relative z-10 flex w-full min-w-0 max-w-[1024px] flex-col items-center justify-center gap-5 sm:gap-8">
          <span className="w-full min-w-0 px-2 text-center font-['Montserrat'] font-[900] leading-[1.1] tracking-tight text-brand-900 text-[clamp(1.25rem,calc(0.65rem+3.8vw),3.875rem)]">
            {" CHOOSE GEMETRA FOR BORDERLESS PAYMENTS"}
          </span>
          <span className="max-w-[40rem] px-2 text-center font-['Montserrat'] text-[15px] font-[400] leading-relaxed text-default-font sm:text-[18px] sm:leading-[28px]">
            {
              "Combining Web3 speed with AI-driven financial intelligence for VAT refunds and global payroll on a single trustless platform."
            }
          </span>
        </div>
      </div>



      {/* CTA Section */}
      <div
        id="pricing-section"
        className="relative flex w-full min-w-0 flex-col items-center justify-center gap-6 overflow-hidden bg-default-background px-4 py-20 sm:px-6 sm:py-28 lg:py-32"
      >
        {/* Squares Background */}
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor="#f1f1f1"
          hoverFillColor="#F1F1F1"
        />

        {/* Animated Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-brand-50/10 to-transparent animate-pulse-slow z-0"></div>

        <div className="relative z-10 flex w-full min-w-0 max-w-[1280px] flex-col items-center justify-center gap-6 rounded-2xl bg-white px-4 pb-12 pt-16 shadow-2xl sm:gap-8 sm:rounded-[32px] sm:px-6 sm:pb-16 sm:pt-24">
          <div className="absolute -top-10 left-1/2 z-20 max-w-[calc(100%-1.5rem)] -translate-x-1/2 transform rounded-full bg-brand-800 px-4 py-3 text-center text-white shadow-lg sm:-top-12 sm:px-8 sm:py-4">
            <span className="font-['Montserrat'] text-sm font-[700] sm:text-[18px]">
              Ready to Transform Your Financial Operations?
            </span>
          </div>

          <div className="relative z-10 flex w-full min-w-0 flex-col items-center justify-center gap-5 sm:gap-6">
            <span className="w-full min-w-0 max-w-[40rem] px-2 text-center font-['Montserrat'] font-[900] leading-[1.05] tracking-tight text-brand-900 text-[clamp(2.25rem,calc(1.25rem+6vw),4.5rem)]">
              {"START TODAY"}
            </span>
            <span className="w-full min-w-0 max-w-[40rem] px-2 text-center font-['Montserrat'] text-[15px] font-[500] leading-relaxed text-brand-900 sm:text-[18px] sm:leading-[28px]">
              {
                "Join the next-generation remittance infrastructure — fast, borderless, compliant, and scalable for both VAT refunds and global payroll."
              }
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8 mb-12">
              <div className="bg-neutral-50 rounded-xl p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <Clock size={24} className="text-green-700" />
                </div>
                <h3 className="font-['Montserrat'] text-[18px] font-[700] text-brand-900 mb-2">Save Time</h3>
                <p className="text-subtext-color text-sm">Instant transactions with &lt;1s settlement time</p>
              </div>

              <div className="bg-neutral-50 rounded-xl p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <DollarSign size={24} className="text-green-700" />
                </div>
                <h3 className="font-['Montserrat'] text-[18px] font-[700] text-brand-900 mb-2">Save Money</h3>
                <p className="text-subtext-color text-sm">Up to 95% lower fees than traditional banking</p>
              </div>

              <div className="bg-neutral-50 rounded-xl p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <Shield size={24} className="text-green-700" />
                </div>
                <h3 className="font-['Montserrat'] text-[18px] font-[700] text-brand-900 mb-2">Stay Compliant</h3>
                <p className="text-subtext-color text-sm">AI-powered compliance across jurisdictions</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-center">
            <ConnectButton />

            <span className="text-subtext-color">or</span>

            <Button
              size="large"
              variant="primary"
              onClick={() => window.open('https://youtu.be/j9PxVo5DRxE', '_blank')}
              icon={<Play size={20} />}
              className="px-10 py-6 bg-brand-600 hover:bg-brand-700 text-white transition-all duration-300 text-lg"
            >
              Watch Demo
            </Button>

            <Button
              size="large"
              variant="neutral-secondary"
              onClick={() => window.open('https://docs.google.com/presentation/d/1QxKpMPxLiS-bpKkow8S5PApxNrgUUppg64oxbx-tU28/edit?usp=sharing', '_blank')}
              icon={<ArrowRight size={20} />}
              className="px-10 py-6 hover:bg-brand-50 transition-all duration-300 text-lg"
            >
              View Pitch Deck
            </Button>
          </div>

          <div className="mt-12 flex items-center gap-2 text-subtext-color">
            <Shield size={16} />
            <span className="text-sm">Enterprise-grade security with multi-sig treasury and oracle verification</span>
          </div>
        </div>
      </div>

      {/* Footer - Only on landing page */}
      <div className="flex w-full flex-col items-start">
        <EnhancedFooter />
      </div>
    </div>
  );
}

export default GemetraLandingPage;
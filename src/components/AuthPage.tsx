import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Armchair, 
  ArrowRight, 
  Send, 
  Compass, 
  Store, 
  Check, 
  Building2, 
  MapPin, 
  Utensils, 
  X,
  Smartphone,
  ShieldAlert,
  Clock,
  KeyRound,
  RotateCcw,
  Crown
} from 'lucide-react';
import { 
  AuthMode, 
  LoginFormData, 
  SignUpFormData, 
  AuthValidationErrors, 
  UserRole, 
  Restaurant,
  OtpRequestResult 
} from '../types';
import { 
  validateLoginForm, 
  validateSignUpForm, 
  submitSignIn, 
  submitSignUp, 
  requestOtp,
  verifyOtp,
  resetPasswordWithOtp,
  accessDemoRestaurant,
  getStoredSession, 
  saveStoredSession,
  maskIdentifier,
  EMAIL_REGEX,
  INDIAN_PHONE_REGEX
} from '../services/authService';
import { RESTAURANTS_DATA } from '../data/mockData';
import { OtpVerificationModal } from './OtpVerificationModal';
import { FirstTimeWelcomeModal } from './FirstTimeWelcomeModal';

interface AuthPageProps {
  initialMode?: AuthMode;
  onNavigateHome: () => void;
  onAuthSuccess: (
    userSummary?: { 
      userId?: string; 
      fullName?: string; 
      email: string; 
      mobileNumber?: string; 
      phone?: string; 
      restaurantId?: string;
      isFirstTimeLogin?: boolean;
    },
    selectedRole?: UserRole
  ) => void;
  onModeChange?: (mode: AuthMode) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onNavigateHome,
  onAuthSuccess,
  onModeChange,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  
  // Registration option: Option 1 (Email) vs Option 2 (Mobile Number)
  const [signupMethod, setSignupMethod] = useState<'email' | 'mobile'>('email');

  // Form States
  const [loginData, setLoginData] = useState<LoginFormData>({
    loginIdentifier: '',
    email: '',
    password: '',
  });

  const [signUpData, setSignUpData] = useState<SignUpFormData>({
    signupMethod: 'email',
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
  });

  // UI States
  const [errors, setErrors] = useState<AuthValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [demoLoading, setDemoLoading] = useState<'customer' | 'restaurant-owner' | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Role Selection State: 'customer' or 'restaurant-owner' or 'company-admin'
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  
  // Brute-force lockout countdown timer (e.g., 60 seconds after 5 failed attempts)
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // OTP Verification Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [pendingOtpDestination, setPendingOtpDestination] = useState<string>('');
  const [pendingOtpType, setPendingOtpType] = useState<'email' | 'mobile'>('email');
  const [initialOtpResult, setInitialOtpResult] = useState<OtpRequestResult | null>(null);

  // First-Time Welcome Modal State (Requirement 4)
  const [firstTimeModalOpen, setFirstTimeModalOpen] = useState<boolean>(false);
  const [firstTimeUserData, setFirstTimeUserData] = useState<any>(null);

  // Role Selection before Mobile Number Verification Modal State
  const [isRoleModalBeforeMobileVerificationOpen, setIsRoleModalBeforeMobileVerificationOpen] = useState<boolean>(false);
  const [pendingMobileDestination, setPendingMobileDestination] = useState<string>('');

  // Post-Login Role Choice Modal State (Customer vs Restaurant Owner)
  const [postLoginRoleChoiceUser, setPostLoginRoleChoiceUser] = useState<any>(null);

  // Forgot password flow state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'new_password'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState<string>('');
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [forgotToken, setForgotToken] = useState<string>('');
  const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>('');
  const [forgotStatus, setForgotStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState<boolean>(false);
  const [forgotCooldown, setForgotCooldown] = useState<number>(0);
  const [forgotDevCode, setForgotDevCode] = useState<string | undefined>(undefined);

  // Demo Restaurant Access State (rest-1 to rest-10)
  const [demoRestaurantId, setDemoRestaurantId] = useState<string>('');
  const [demoRestaurantError, setDemoRestaurantError] = useState<string | null>(null);
  const [demoRestaurantLoading, setDemoRestaurantLoading] = useState<boolean>(false);

  // Restaurant Selection state for Rohan / Owner Login
  const [showRestaurantPicker, setShowRestaurantPicker] = useState<boolean>(false);
  const [pendingOwnerUser, setPendingOwnerUser] = useState<any>(null);

  // Lockout timer effect
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  // Forgot password cooldown effect
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  const handleSelectOwnerRestaurant = (restaurant: Restaurant) => {
    const finalSummary = {
      ...(pendingOwnerUser || { email: '', fullName: 'Restaurant Owner' }),
      restaurantId: restaurant.id,
    };

    const session = getStoredSession();
    if (session) {
      saveStoredSession({
        ...session,
        restaurantId: restaurant.id,
      });
    }

    setShowRestaurantPicker(false);
    onAuthSuccess(finalSummary, 'restaurant-owner');
  };

  // Switch between Login and Sign Up
  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setTouched({});
    if (onModeChange) onModeChange(newMode);
  };

  // Login identifier change
  const handleLoginIdentifierChange = (value: string) => {
    setLoginData((prev) => ({ 
      ...prev, 
      loginIdentifier: value,
      email: value.includes('@') ? value : '' 
    }));
    if (errors.loginIdentifier || errors.general) {
      setErrors((prev) => ({ ...prev, loginIdentifier: undefined, general: undefined }));
    }
  };

  // Identify whether login identifier is Email or Mobile
  const loginIdentifierType = React.useMemo(() => {
    const trimmed = (loginData.loginIdentifier || '').trim();
    if (!trimmed) return null;
    if (trimmed.includes('@')) return 'email';
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 7) return 'mobile';
    return null;
  }, [loginData.loginIdentifier]);

  // Sign up input change
  const handleSignUpChange = (field: keyof SignUpFormData, value: string) => {
    setSignUpData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (mode === 'login') {
      const validation = validateLoginForm(loginData);
      setErrors((prev) => ({
        ...prev,
        [field]: validation[field as keyof AuthValidationErrors],
      }));
    } else {
      const currentSignUpData = { ...signUpData, signupMethod };
      const validation = validateSignUpForm(currentSignUpData);
      setErrors((prev) => ({
        ...prev,
        [field]: validation[field as keyof AuthValidationErrors],
      }));
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;
    setIsSubmitting(true);

    if (mode === 'login') {
      const validationErrors = validateLoginForm(loginData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors({
          ...validationErrors,
          general: validationErrors.loginIdentifier || validationErrors.password || 'Please enter valid login credentials.',
        });
        setTouched({ loginIdentifier: true, password: true });
        setIsSubmitting(false);
        return;
      }

      try {
        const result = await submitSignIn(loginData, selectedRole);
        setIsSubmitting(false);

        if (result.success && result.userSummary) {
          // If first-time login flag is set on account, display first-time welcome message
          if (result.isFirstTimeLogin) {
            setFirstTimeUserData(result.userSummary);
            setFirstTimeModalOpen(true);
            return;
          }

          if (selectedRole === 'company-admin' || result.userSummary.role === 'company-admin') {
            onAuthSuccess(result.userSummary, 'company-admin');
            return;
          }

          const effectiveRole = result.userSummary.role || selectedRole;
          if (effectiveRole === 'restaurant-owner' || selectedRole === 'restaurant-owner') {
            const ownerSummary = {
              ...result.userSummary,
              role: 'restaurant-owner' as UserRole,
              restaurantId: result.userSummary.restaurantId || 'rest-1',
            };
            onAuthSuccess(ownerSummary, 'restaurant-owner');
            return;
          }

          onAuthSuccess(result.userSummary, 'customer');
        } else {
          if (result.message?.includes('locked')) {
            setLockoutRemaining(60);
          }
          setErrors(result.errors || { general: result.message || 'Invalid email/mobile number or password.' });
        }
      } catch {
        setErrors({ general: 'Invalid email/mobile number or password.' });
        setIsSubmitting(false);
      }
    } else {
      // Sign Up Flow - Two-Step Registration & OTP Verification
      const currentSignUpData = { ...signUpData, signupMethod };
      const validationErrors = validateSignUpForm(currentSignUpData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setTouched({
          fullName: true,
          email: signupMethod === 'email',
          mobileNumber: signupMethod === 'mobile',
          password: true,
          confirmPassword: true,
        });
        setIsSubmitting(false);
        return;
      }

      const targetDestination = signupMethod === 'email' ? signUpData.email.trim() : signUpData.mobileNumber.trim();
      setPendingOtpDestination(targetDestination);
      setPendingOtpType(signupMethod);

      // REQUIREMENT 1: Ask the app user to select whether they want to enter the app as a Customer or Restaurant Owner BEFORE verifying their mobile number!
      if (signupMethod === 'mobile') {
        setPendingMobileDestination(targetDestination);
        setIsRoleModalBeforeMobileVerificationOpen(true);
        setIsSubmitting(false);
        return;
      }

      try {
        // Request Real OTP for Email
        const otpRes = await requestOtp(targetDestination, signupMethod, 'signup');
        setIsSubmitting(false);

        if (otpRes.success) {
          setInitialOtpResult(otpRes);
          setIsOtpModalOpen(true);
        } else {
          setErrors({ general: otpRes.message || 'Unable to request verification code.' });
        }
      } catch {
        setIsSubmitting(false);
        setErrors({ general: 'Unable to reach verification service. Please try again.' });
      }
    }
  };

  // Handler to confirm role selection before mobile verification and dispatch OTP
  const handleConfirmRoleAndProceedToMobileOtp = async (chosenRole: UserRole) => {
    setSelectedRole(chosenRole);
    setIsRoleModalBeforeMobileVerificationOpen(false);
    setIsSubmitting(true);

    try {
      const destination = pendingMobileDestination || signUpData.mobileNumber.trim();
      setPendingOtpDestination(destination);
      setPendingOtpType('mobile');
      const otpRes = await requestOtp(destination, 'mobile', 'signup');
      setIsSubmitting(false);

      if (otpRes.success) {
        setInitialOtpResult(otpRes);
        setIsOtpModalOpen(true);
      } else {
        setErrors({ general: otpRes.message || 'Unable to dispatch mobile verification code.' });
      }
    } catch {
      setIsSubmitting(false);
      setErrors({ general: 'Unable to reach verification service. Please try again.' });
    }
  };

  // Handler for role selection after login
  const handleSelectPostLoginRole = (chosenRole: UserRole) => {
    if (!postLoginRoleChoiceUser) return;
    const user = postLoginRoleChoiceUser;
    setPostLoginRoleChoiceUser(null);
    setSelectedRole(chosenRole);

    if (chosenRole === 'restaurant-owner' && !user.restaurantId) {
      setPendingOwnerUser(user);
      setShowRestaurantPicker(true);
      return;
    }

    onAuthSuccess(user, chosenRole);
  };

  // Callback when OTP verification succeeds during signup
  const handleOtpVerified = async (verificationToken: string) => {
    setIsOtpModalOpen(false);
    setIsSubmitting(true);

    try {
      const currentSignUpData = { ...signUpData, signupMethod };
      const res = await submitSignUp(currentSignUpData, selectedRole, verificationToken);
      setIsSubmitting(false);

      if (res.success && res.userSummary) {
        // Display First-Time Registration & Login Success Message (Requirement 4)
        setFirstTimeUserData(res.userSummary);
        setFirstTimeModalOpen(true);
      } else {
        setErrors({ general: res.message || 'Account registration could not be completed.' });
      }
    } catch {
      setIsSubmitting(false);
      setErrors({ general: 'Account registration failed. Please try again.' });
    }
  };

  // Proceed after First-Time Welcome Modal
  const handleProceedFromWelcome = () => {
    setFirstTimeModalOpen(false);
    if (firstTimeUserData) {
      onAuthSuccess(firstTimeUserData, selectedRole);
    } else {
      onNavigateHome();
    }
  };

  // Forgot password Step 1: Send OTP
  const handleForgotRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotStatus({ success: false, message: 'Please enter your registered Email ID or Mobile Number.' });
      return;
    }

    const isEmail = forgotIdentifier.includes('@');
    const type: 'email' | 'mobile' = isEmail ? 'email' : 'mobile';

    setIsForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await requestOtp(forgotIdentifier.trim(), type, 'forgot_password');
      setIsForgotLoading(false);
      if (res.success) {
        setForgotStep('verify');
        setForgotCooldown(res.cooldownSeconds || 30);
        setForgotDevCode(res.testDeliveryCode);
        setForgotStatus({
          success: true,
          message: `Verification code sent to ${res.destinationMasked}.`,
        });
      } else {
        setForgotStatus({ success: false, message: res.message || 'Unable to dispatch verification code.' });
      }
    } catch {
      setIsForgotLoading(false);
      setForgotStatus({ success: false, message: 'Unable to connect to verification server.' });
    }
  };

  // Forgot password Step 2: Verify OTP
  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setForgotStatus({ success: false, message: 'Please enter the 6-digit verification code.' });
      return;
    }

    setIsForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await verifyOtp(forgotIdentifier.trim(), forgotOtp.trim(), 'forgot_password');
      setIsForgotLoading(false);
      if (res.success && res.verificationToken) {
        setForgotToken(res.verificationToken);
        setForgotStep('new_password');
        setForgotStatus({ success: true, message: 'Code verified! Please enter your new password.' });
      } else {
        setForgotStatus({ success: false, message: res.message || 'Invalid verification code.' });
      }
    } catch {
      setIsForgotLoading(false);
      setForgotStatus({ success: false, message: 'Verification error. Please try again.' });
    }
  };

  // Forgot password Step 3: Update Password
  const handleForgotSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotStatus({ success: false, message: 'New password must be at least 6 characters.' });
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotStatus({ success: false, message: 'Passwords do not match.' });
      return;
    }

    setIsForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await resetPasswordWithOtp(forgotIdentifier.trim(), forgotToken, forgotNewPassword);
      setIsForgotLoading(false);
      if (res.success) {
        setForgotStatus({ success: true, message: 'Password reset successful! Please log in.' });
        setTimeout(() => {
          setIsForgotModalOpen(false);
          setForgotStep('request');
          setForgotIdentifier('');
          setForgotOtp('');
          setForgotNewPassword('');
          setForgotConfirmPassword('');
          setLoginData((prev) => ({ ...prev, loginIdentifier: forgotIdentifier.trim(), password: '' }));
        }, 1500);
      } else {
        setForgotStatus({ success: false, message: res.message || 'Failed to update password.' });
      }
    } catch {
      setIsForgotLoading(false);
      setForgotStatus({ success: false, message: 'Network error. Please try again.' });
    }
  };

  // Quick Demo Access Login
  const handleDemoLogin = async (role: 'customer' | 'restaurant-owner') => {
    if (isSubmitting || demoLoading !== null) return;
    setDemoLoading(role);
    setErrors({});

    const demoCredentials = role === 'customer'
      ? { identifier: 'sanket@gmail.com', password: 'sanket2006', role: 'customer' as UserRole }
      : { identifier: 'rohan@gmail.com', password: 'rohan2006', role: 'restaurant-owner' as UserRole };

    setLoginData({
      loginIdentifier: demoCredentials.identifier,
      email: demoCredentials.identifier,
      password: demoCredentials.password,
    });
    setSelectedRole(demoCredentials.role);

    try {
      const result = await submitSignIn(
        { loginIdentifier: demoCredentials.identifier, email: demoCredentials.identifier, password: demoCredentials.password },
        demoCredentials.role
      );

      if (result.success) {
        setDemoLoading(null);
        if (demoCredentials.role === 'restaurant-owner') {
          setPendingOwnerUser(result.userSummary || {
            email: demoCredentials.identifier,
            fullName: 'Rohan',
          });
          setShowRestaurantPicker(true);
          return;
        }
        onAuthSuccess(result.userSummary, demoCredentials.role);
      } else {
        setErrors(result.errors || { general: result.message || 'Demo login failed.' });
        setDemoLoading(null);
      }
    } catch {
      setErrors({ general: 'Authentication error occurred.' });
      setDemoLoading(null);
    }
  };

  // Demo Restaurant Access Handler (rest-1 to rest-10)
  const handleDemoRestaurantAccess = (idToUse?: string) => {
    if (isSubmitting || demoRestaurantLoading) return;
    const rawId = idToUse !== undefined ? idToUse : demoRestaurantId;
    const trimmedId = (rawId || '').trim();

    if (!trimmedId) {
      setDemoRestaurantError('Please enter a Restaurant ID (e.g. rest-2 or rest-10).');
      return;
    }

    setDemoRestaurantLoading(true);
    setDemoRestaurantError(null);

    const result = accessDemoRestaurant(trimmedId);
    setDemoRestaurantLoading(false);

    if (result.success && result.userSummary) {
      setSelectedRole('restaurant-owner');
      onAuthSuccess(result.userSummary, 'restaurant-owner');
    } else {
      setDemoRestaurantError(result.message || 'Invalid Restaurant ID.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-between selection:bg-[#4F6F521A] selection:text-[#4F6F52]">
      
      {/* Top Navigation Bar */}
      <header className="w-full bg-[#FAF9F6]/80 backdrop-blur-md border-b border-[#E8E6E1] py-4 px-4 sm:px-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2C3333]/80 hover:text-[#4F6F52] transition-colors cursor-pointer group"
            id="auth-back-to-home-btn"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Discovery</span>
          </button>

          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#4F6F52] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ⚡
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-[#2C3333]">
              Flash<span className="text-[#4F6F52]">Table</span>
            </span>
          </div>

          <div className="text-xs text-[#2C3333]/60 hidden sm:block font-medium">
            Table Reservations & Dining Security
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
          
          <div className="bg-white rounded-3xl border border-[#E8E6E1] shadow-xl overflow-hidden">
            
            {/* Header Tab Switcher */}
            <div className="grid grid-cols-2 border-b border-[#E8E6E1] bg-[#FAF9F6]/50 p-1.5">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className={`py-3 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-[#4F6F52] shadow-sm border border-[#E8E6E1]'
                    : 'text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-white/60'
                }`}
                id="tab-login"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('signup')}
                className={`py-3 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-[#4F6F52] shadow-sm border border-[#E8E6E1]'
                    : 'text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-white/60'
                }`}
                id="tab-signup"
              >
                Sign Up
              </button>
            </div>

            <div className="p-6 sm:p-8">
              
              {/* Context Title */}
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#2C3333]">
                  {mode === 'login' 
                    ? (selectedRole === 'company-admin' ? 'Company Administration Portal' : 'Welcome to Flash Table')
                    : 'Create Your Flash Table Account'}
                </h1>
                <p className="text-xs sm:text-sm text-[#2C3333]/60 mt-1">
                  {mode === 'login' 
                    ? 'Log in using your registered Email ID or Mobile Number and password'
                    : 'Choose your registration option and verify your contact details'}
                </p>
              </div>

              {/* General Error Banner */}
              {errors.general && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs font-semibold text-rose-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Brute-force Lockout Warning Banner */}
              {lockoutRemaining > 0 && (
                <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs font-bold text-amber-900 animate-in fade-in">
                  <Clock className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>Account temporarily locked due to 5 consecutive failed attempts. Please wait {lockoutRemaining} seconds.</span>
                </div>
              )}

              {/* ============================================================== */}
              {/* ======================== LOGIN FORM ========================== */}
              {/* ============================================================== */}
              {mode === 'login' && (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  
                  {/* Email ID or Mobile Number Field (Requirement 5) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label 
                        htmlFor="login-identifier" 
                        className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]/80"
                      >
                        Email ID or Mobile Number <span className="text-rose-500">*</span>
                      </label>

                      {/* Real-time contact type identification badge */}
                      {loginIdentifierType === 'email' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4F6F52] bg-[#4F6F5214] px-2 py-0.5 rounded-md border border-[#4F6F52]/20">
                          <Mail className="w-3 h-3" />
                          <span>Email ID detected</span>
                        </span>
                      )}
                      {loginIdentifierType === 'mobile' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Smartphone className="w-3 h-3" />
                          <span>Mobile Number (+91)</span>
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C3333]/40">
                        {loginIdentifierType === 'mobile' ? (
                          <Smartphone className="w-4 h-4 text-[#4F6F52]" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </div>
                      <input
                        id="login-identifier"
                        name="loginIdentifier"
                        type="text"
                        autoComplete="username"
                        value={loginData.loginIdentifier}
                        onChange={(e) => handleLoginIdentifierChange(e.target.value)}
                        onBlur={() => handleBlur('loginIdentifier')}
                        placeholder="e.g. name@example.com or 9845012260"
                        className={`w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border rounded-2xl text-xs sm:text-sm text-[#2C3333] outline-none transition-all placeholder:text-[#2C3333]/30 ${
                          errors.loginIdentifier
                            ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-200'
                            : 'border-[#E8E6E1] focus:border-[#4F6F52] focus:bg-white focus:ring-1 focus:ring-[#4F6F52]/20'
                        }`}
                      />
                    </div>
                    {errors.loginIdentifier && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.loginIdentifier}</span>
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label 
                        htmlFor="login-password" 
                        className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]/80"
                      >
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotIdentifier(loginData.loginIdentifier || '');
                          setForgotStatus(null);
                          setForgotStep('request');
                          setIsForgotModalOpen(true);
                        }}
                        className="text-xs text-[#4F6F52] hover:text-[#3D5A40] hover:underline font-medium cursor-pointer"
                        id="login-forgot-password-link"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C3333]/40">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        onBlur={() => handleBlur('password')}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-11 py-3 bg-[#FAF9F6] border rounded-2xl text-xs sm:text-sm text-[#2C3333] outline-none transition-all placeholder:text-[#2C3333]/30 ${
                          errors.password
                            ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-200'
                            : 'border-[#E8E6E1] focus:border-[#4F6F52] focus:bg-white focus:ring-1 focus:ring-[#4F6F52]/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#2C3333]/40 hover:text-[#2C3333] cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.password}</span>
                      </p>
                    )}
                  </div>

                  {/* Role selection: Customer or Restaurant Owner */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]/80">
                      Login Account Type
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Customer Card */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedRole('customer');
                          if (errors.general) setErrors((prev) => ({ ...prev, general: undefined }));
                        }}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all text-left flex items-center justify-between ${
                          selectedRole === 'customer'
                            ? 'border-[#4F6F52] bg-[#4F6F520A] ring-1 ring-[#4F6F52]/20'
                            : 'border-[#E8E6E1] bg-[#FAF9F6] hover:bg-white'
                        }`}
                        id="role-login-customer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            selectedRole === 'customer' ? 'bg-[#4F6F52] text-white' : 'bg-[#4F6F521A] text-[#4F6F52]'
                          }`}>
                            <Compass className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#2C3333]">Customer</div>
                            <div className="text-[10px] text-stone-500">Bookings</div>
                          </div>
                        </div>
                        {selectedRole === 'customer' && <Check className="w-4 h-4 text-[#4F6F52]" />}
                      </div>

                      {/* Restaurant Owner Card */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedRole('restaurant-owner');
                          if (errors.general) setErrors((prev) => ({ ...prev, general: undefined }));
                        }}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all text-left flex items-center justify-between ${
                          selectedRole === 'restaurant-owner'
                            ? 'border-[#4F6F52] bg-[#4F6F520A] ring-1 ring-[#4F6F52]/20'
                            : 'border-[#E8E6E1] bg-[#FAF9F6] hover:bg-white'
                        }`}
                        id="role-login-restaurant-owner"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            selectedRole === 'restaurant-owner' ? 'bg-[#4F6F52] text-white' : 'bg-[#4F6F521A] text-[#4F6F52]'
                          }`}>
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#2C3333]">Restaurant</div>
                            <div className="text-[10px] text-stone-500">Partner Console</div>
                          </div>
                        </div>
                        {selectedRole === 'restaurant-owner' && <Check className="w-4 h-4 text-[#4F6F52]" />}
                      </div>
                    </div>
                  </div>

                  {/* Primary Log In Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || lockoutRemaining > 0}
                    className="w-full py-3.5 px-6 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    id="login-submit-btn"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Log In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Toggle to Sign Up */}
                  <div className="text-center pt-2 text-xs text-[#2C3333]/70">
                    <span>Don't have an account? </span>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('signup')}
                      className="font-bold text-[#4F6F52] hover:text-[#3D5A40] hover:underline cursor-pointer"
                      id="link-to-signup"
                    >
                      Sign up with Email or Mobile
                    </button>
                  </div>
                </form>
              )}

              {/* ============================================================== */}
              {/* ======================= SIGN UP FORM ========================= */}
              {/* ============================================================== */}
              {mode === 'signup' && (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  
                  {/* REQUIREMENT 1: Ask user whether they want to enter the app as Customer or Restaurant Owner */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]">
                        Enter Flash Table As: <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-stone-500 font-semibold">
                        Role selection before verification
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Customer Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedRole('customer')}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          selectedRole === 'customer'
                            ? 'border-[#4F6F52] bg-white ring-2 ring-[#4F6F52]/20 shadow-xs'
                            : 'border-[#E8E6E1] bg-stone-50/50 hover:bg-white'
                        }`}
                        id="signup-role-customer"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            selectedRole === 'customer' ? 'bg-[#4F6F52] text-white' : 'bg-stone-200 text-stone-600'
                          }`}>
                            <Compass className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#2C3333] block">Customer</span>
                            <span className="text-[10px] text-stone-500">Diner & Reservations</span>
                          </div>
                        </div>
                      </button>

                      {/* Restaurant Owner Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedRole('restaurant-owner')}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          selectedRole === 'restaurant-owner'
                            ? 'border-[#4F6F52] bg-white ring-2 ring-[#4F6F52]/20 shadow-xs'
                            : 'border-[#E8E6E1] bg-stone-50/50 hover:bg-white'
                        }`}
                        id="signup-role-owner"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            selectedRole === 'restaurant-owner' ? 'bg-[#4F6F52] text-white' : 'bg-stone-200 text-stone-600'
                          }`}>
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#2C3333] block">Restaurant Owner</span>
                            <span className="text-[10px] text-emerald-700 font-bold">1st Month FREE</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* TWO REGISTRATION OPTIONS (Requirement 2) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]/80 mb-2">
                      Select Registration Method <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2.5 p-1 bg-[#FAF9F6] rounded-2xl border border-[#E8E6E1]">
                      {/* OPTION 1: EMAIL ID */}
                      <button
                        type="button"
                        onClick={() => {
                          setSignupMethod('email');
                          setErrors({});
                        }}
                        className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          signupMethod === 'email'
                            ? 'bg-white text-[#4F6F52] shadow-sm border border-[#E8E6E1]'
                            : 'text-[#2C3333]/60 hover:text-[#2C3333]'
                        }`}
                        id="signup-option-email"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          signupMethod === 'email' ? 'bg-[#4F6F52] text-white' : 'bg-stone-200 text-stone-600'
                        }`}>
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <span>Option 1: Email ID</span>
                      </button>

                      {/* OPTION 2: MOBILE NUMBER */}
                      <button
                        type="button"
                        onClick={() => {
                          setSignupMethod('mobile');
                          setErrors({});
                        }}
                        className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          signupMethod === 'mobile'
                            ? 'bg-white text-[#4F6F52] shadow-sm border border-[#E8E6E1]'
                            : 'text-[#2C3333]/60 hover:text-[#2C3333]'
                        }`}
                        id="signup-option-mobile"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          signupMethod === 'mobile' ? 'bg-[#4F6F52] text-white' : 'bg-stone-200 text-stone-600'
                        }`}>
                          <Smartphone className="w-3.5 h-3.5" />
                        </div>
                        <span>Option 2: Mobile Number</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Full Name Field */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="signup-fullname" 
                      className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]/80"
                    >
                      Customer Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C3333]/40">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-fullname"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        value={signUpData.fullName}
                        onChange={(e) => handleSignUpChange('fullName', e.target.value)}
                        onBlur={() => handleBlur('fullName')}
                        placeholder="Enter your full name"
                        className={`w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border rounded-2xl text-xs sm:text-sm text-[#2C3333] outline-none transition-all placeholder:text-[#2C3333]/30 ${
                          errors.fullName
                            ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-200'
                            : 'border-[#E8E6E1] focus:border-[#4F6F52] focus:bg-white focus:ring-1 focus:ring-[#4F6F52]/20'
                        }`}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.fullName}</span>
                      </p>
                    )}
                  </div>

                  {/* CONDITIONAL CONTACT FIELD */}
                  {signupMethod === 'email' ? (
                    /* OPTION 1: EMAIL ID FIELD */
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <label 
                        htmlFor="signup-email" 
                        className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]/80"
                      >
                        Customer Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C3333]/40">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          id="signup-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={signUpData.email}
                          onChange={(e) => handleSignUpChange('email', e.target.value)}
                          onBlur={() => handleBlur('email')}
                          placeholder="name@example.com"
                          className={`w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border rounded-2xl text-xs sm:text-sm text-[#2C3333] outline-none transition-all placeholder:text-[#2C3333]/30 ${
                            errors.email
                              ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-200'
                              : 'border-[#E8E6E1] focus:border-[#4F6F52] focus:bg-white focus:ring-1 focus:ring-[#4F6F52]/20'
                          }`}
                        />
                      </div>
                      {errors.email ? (
                        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.email}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-stone-500">
                          A 6-digit OTP will be sent to verify this email address.
                        </p>
                      )}
                    </div>
                  ) : (
                    /* OPTION 2: MOBILE NUMBER FIELD */
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <label 
                        htmlFor="signup-mobile" 
                        className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]/80"
                      >
                        Indian Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <div className={`flex rounded-2xl border bg-[#FAF9F6] overflow-hidden transition-all ${
                        errors.mobileNumber
                          ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200'
                          : 'border-[#E8E6E1] focus-within:border-[#4F6F52] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#4F6F52]/20'
                      }`}>
                        <span className="px-3.5 py-3 text-xs font-semibold text-[#2C3333]/70 border-r border-[#E8E6E1] bg-[#FAF9F6] flex items-center gap-1 select-none">
                          <Phone className="w-3.5 h-3.5 text-[#4F6F52]" />
                          <span>+91</span>
                        </span>
                        <input
                          id="signup-mobile"
                          name="mobileNumber"
                          type="tel"
                          maxLength={15}
                          value={signUpData.mobileNumber}
                          onChange={(e) => handleSignUpChange('mobileNumber', e.target.value)}
                          onBlur={() => handleBlur('mobileNumber')}
                          placeholder="98450 12345"
                          className="w-full px-3.5 py-3 text-xs sm:text-sm bg-transparent text-[#2C3333] outline-none placeholder:text-[#2C3333]/30"
                        />
                      </div>
                      {errors.mobileNumber ? (
                        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.mobileNumber}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-stone-500">
                          A real 6-digit OTP will be sent to this number for SMS verification.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Password & Confirm Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Password */}
                    <div className="space-y-1.5">
                      <label 
                        htmlFor="signup-password" 
                        className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]/80"
                      >
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C3333]/40">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="signup-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={signUpData.password}
                          onChange={(e) => handleSignUpChange('password', e.target.value)}
                          onBlur={() => handleBlur('password')}
                          placeholder="Min. 6 chars"
                          className={`w-full pl-10 pr-10 py-3 bg-[#FAF9F6] border rounded-2xl text-xs sm:text-sm text-[#2C3333] outline-none transition-all placeholder:text-[#2C3333]/30 ${
                            errors.password
                              ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-200'
                              : 'border-[#E8E6E1] focus:border-[#4F6F52] focus:bg-white focus:ring-1 focus:ring-[#4F6F52]/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#2C3333]/40 hover:text-[#2C3333] cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.password}</span>
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label 
                        htmlFor="signup-confirm-password" 
                        className="block text-[11px] font-bold uppercase tracking-widest text-[#2C3333]/80"
                      >
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C3333]/40">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="signup-confirm-password"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={signUpData.confirmPassword}
                          onChange={(e) => handleSignUpChange('confirmPassword', e.target.value)}
                          onBlur={() => handleBlur('confirmPassword')}
                          placeholder="Re-enter password"
                          className={`w-full pl-10 pr-10 py-3 bg-[#FAF9F6] border rounded-2xl text-xs sm:text-sm text-[#2C3333] outline-none transition-all placeholder:text-[#2C3333]/30 ${
                            errors.confirmPassword
                              ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-200'
                              : 'border-[#E8E6E1] focus:border-[#4F6F52] focus:bg-white focus:ring-1 focus:ring-[#4F6F52]/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#2C3333]/40 hover:text-[#2C3333] cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.confirmPassword}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-md shadow-[#4F6F52]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    id="signup-submit-btn"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Continue & Send Verification OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Toggle to Log In */}
                  <div className="text-center pt-2 text-xs text-[#2C3333]/70">
                    <span>Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('login')}
                      className="font-bold text-[#4F6F52] hover:text-[#3D5A40] hover:underline cursor-pointer"
                      id="link-to-login"
                    >
                      Log in
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>
        </div>
      </main>

      {/* OTP Verification Modal (Requirements 2, 3, 6) */}
      <OtpVerificationModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        destination={pendingOtpDestination}
        destinationType={pendingOtpType}
        purpose="signup"
        initialOtpResult={initialOtpResult}
        onVerified={handleOtpVerified}
        selectedRole={selectedRole === 'restaurant-owner' ? 'restaurant-owner' : 'customer'}
        onChangeRole={(newRole) => setSelectedRole(newRole)}
      />

      {/* Modal 1: Role Selection Before Mobile Verification (Requirement 1) */}
      {isRoleModalBeforeMobileVerificationOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          id="modal-role-select-before-mobile"
        >
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#E8E6E1] shadow-2xl p-6 sm:p-7 relative overflow-hidden space-y-5">
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#4F6F52]/10 text-[#4F6F52] flex items-center justify-center border border-[#4F6F52]/20 shadow-xs">
                  <Smartphone className="w-5 h-5 text-[#4F6F52]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-[#2C3333]">
                    Select Your Role to Enter App
                  </h3>
                  <p className="text-xs text-stone-500">
                    Before verifying mobile number (+91 {pendingMobileDestination || signUpData.mobileNumber.trim()})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalBeforeMobileVerificationOpen(false)}
                className="w-8 h-8 rounded-full border border-[#E8E6E1] bg-white hover:bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              How would you like to enter Flash Table? Please select your role before we dispatch the 6-digit verification code to your mobile number.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option A: Customer */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRole('customer')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedRole === 'customer'
                    ? 'border-[#4F6F52] bg-[#4F6F52]/5 ring-2 ring-[#4F6F52]/20 shadow-sm'
                    : 'border-[#E8E6E1] bg-[#FAF9F6] hover:bg-white'
                }`}
                id="modal-pick-customer"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      selectedRole === 'customer' ? 'bg-[#4F6F52] text-white' : 'bg-stone-200 text-stone-600'
                    }`}>
                      <Compass className="w-4 h-4" />
                    </div>
                    {selectedRole === 'customer' && <CheckCircle2 className="w-5 h-5 text-[#4F6F52]" />}
                  </div>
                  <h4 className="text-sm font-bold text-[#2C3333]">Enter as Customer</h4>
                  <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                    Discover dining venues, check live table openings, instant bookings & flash deals.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#E8E6E1]/60">
                  <span className="text-[10px] font-bold text-[#4F6F52] uppercase tracking-wider block">
                    ✓ Diner Account
                  </span>
                </div>
              </div>

              {/* Option B: Restaurant Owner */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRole('restaurant-owner')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedRole === 'restaurant-owner'
                    ? 'border-[#4F6F52] bg-[#4F6F52]/5 ring-2 ring-[#4F6F52]/20 shadow-sm'
                    : 'border-[#E8E6E1] bg-[#FAF9F6] hover:bg-white'
                }`}
                id="modal-pick-owner"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      selectedRole === 'restaurant-owner' ? 'bg-[#4F6F52] text-white' : 'bg-stone-200 text-stone-600'
                    }`}>
                      <Store className="w-4 h-4" />
                    </div>
                    {selectedRole === 'restaurant-owner' && <CheckCircle2 className="w-5 h-5 text-[#4F6F52]" />}
                  </div>
                  <h4 className="text-sm font-bold text-[#2C3333]">Enter as Restaurant Owner</h4>
                  <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                    Partner dashboard, floor tables, dining bills & partner subscription plans.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#E8E6E1]/60">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider block">
                    ★ 1st Month FREE Plan
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleConfirmRoleAndProceedToMobileOtp(selectedRole)}
              className="w-full py-3.5 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              id="btn-confirm-role-and-send-otp"
            >
              <span>Confirm & Send Verification OTP (123456)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Post-Login Role Choice (Customer vs Restaurant Owner) */}
      {postLoginRoleChoiceUser && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          id="modal-post-login-role-choice"
        >
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#E8E6E1] shadow-2xl p-6 sm:p-7 relative overflow-hidden space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-[#4F6F52]/10 text-[#4F6F52] flex items-center justify-center mx-auto mb-2 border border-[#4F6F52]/20">
                <Crown className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                Welcome Back, {postLoginRoleChoiceUser.fullName || 'User'}!
              </h3>
              <p className="text-xs text-stone-500">
                Please select how you would like to enter Flash Table today:
              </p>
            </div>

            <div className="space-y-3">
              {/* Enter as Customer */}
              <button
                type="button"
                onClick={() => handleSelectPostLoginRole('customer')}
                className="w-full p-4 rounded-2xl border-2 border-[#E8E6E1] hover:border-[#4F6F52] bg-[#FAF9F6] hover:bg-white text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-sm"
                id="btn-login-as-customer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:bg-[#4F6F52] group-hover:text-white transition-colors">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#2C3333]">Use as Customer</h4>
                    <p className="text-[11px] text-stone-500">
                      Explore dining spots, live seating & book tables
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#4F6F52] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Enter as Restaurant Owner */}
              <button
                type="button"
                onClick={() => handleSelectPostLoginRole('restaurant-owner')}
                className="w-full p-4 rounded-2xl border-2 border-[#E8E6E1] hover:border-[#4F6F52] bg-[#FAF9F6] hover:bg-white text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-sm"
                id="btn-login-as-owner"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 group-hover:bg-[#4F6F52] group-hover:text-white transition-colors">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#2C3333]">Use as Restaurant Owner</h4>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-amber-400 text-stone-950 px-1.5 py-0.5 rounded">
                        1st Mo Free
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Partner console, live floor tables & subscription plans
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#4F6F52] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="text-center pt-2 border-t border-[#E8E6E1]/60">
              <span className="text-[11px] text-stone-400">
                You can easily switch roles at any time from the navigation bar.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* First-Time Welcome Modal (Requirement 4) */}
      <FirstTimeWelcomeModal
        isOpen={firstTimeModalOpen}
        onProceed={handleProceedFromWelcome}
        customerName={firstTimeUserData?.fullName}
        email={firstTimeUserData?.email}
        mobile={firstTimeUserData?.mobile || firstTimeUserData?.phone}
      />

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            className="bg-white w-full max-w-md rounded-3xl border border-[#E8E6E1] shadow-2xl p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2C3333]">Reset Password</h3>
                  <p className="text-xs text-[#2C3333]/60">Secure OTP-Based Password Recovery</p>
                </div>
              </div>
              <button 
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotStatus && (
              <div className={`p-3 rounded-xl text-xs font-semibold mb-4 ${
                forgotStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {forgotStatus.message}
              </div>
            )}

            {forgotStep === 'request' && (
              <form onSubmit={handleForgotRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C3333] mb-1">
                    Registered Email ID or Mobile Number
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. name@example.com or 9845012260"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full py-2.5 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isForgotLoading ? <span>Sending Code...</span> : <span>Send Recovery OTP</span>}
                </button>
              </form>
            )}

            {forgotStep === 'verify' && (
              <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C3333] mb-1">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3.5 py-2.5 text-center tracking-widest font-mono text-base font-bold bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52]"
                  />
                  {forgotDevCode && (
                    <div className="mt-1 text-center">
                      <button
                        type="button"
                        onClick={() => setForgotOtp(forgotDevCode)}
                        className="text-[10px] text-amber-800 underline font-mono"
                      >
                        Auto-fill sandbox test code: {forgotDevCode}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isForgotLoading || forgotOtp.length !== 6}
                  className="w-full py-2.5 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {isForgotLoading ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>
            )}

            {forgotStep === 'new_password' && (
              <form onSubmit={handleForgotSubmitNewPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C3333] mb-1">
                    New Password (Min. 6)
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C3333] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full py-2.5 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {isForgotLoading ? 'Updating Password...' : 'Save New Password & Continue'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Select Restaurant Modal for Rohan / Partner Login */}
      {showRestaurantPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E8E6E1] bg-[#FAF9F6] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-[#2C3333]">Select Restaurant Venue</h3>
                  <p className="text-xs text-[#2C3333]/70">Choose the partner venue console to manage</p>
                </div>
              </div>
              <button
                onClick={() => setShowRestaurantPicker(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {RESTAURANTS_DATA.map((restaurant) => (
                <button
                  key={restaurant.id}
                  onClick={() => handleSelectOwnerRestaurant(restaurant)}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-[#E8E6E1] hover:border-[#4F6F52] hover:bg-[#FAF9F6] transition-all text-left bg-white cursor-pointer group"
                >
                  <img
                    src={restaurant.heroImage}
                    alt={restaurant.name}
                    className="w-14 h-14 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-bold">
                      {restaurant.id}
                    </span>
                    <div className="text-sm font-bold text-[#2C3333] group-hover:text-[#4F6F52] truncate mt-0.5">
                      {restaurant.name}
                    </div>
                    <div className="text-xs text-stone-500 truncate">{restaurant.neighborhood}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#4F6F52] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-[#E8E6E1] text-center text-xs text-[#2C3333]/50">
        <p>© 2026 FlashTable Technologies India Pvt. Ltd. • Indiranagar, Bengaluru</p>
      </footer>

    </div>
  );
};

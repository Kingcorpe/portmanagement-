import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  ArrowRight, 
  ArrowLeft,
  Check,
  User,
  Mail,
  Phone,
  Target,
  MessageSquare,
  Calendar,
  Briefcase,
  ShieldCheck,
  GraduationCap,
  Building,
  HandCoins,
  PiggyBank,
  Sparkles,
  Clock
} from "lucide-react";

// Interest type options with icons
const interestOptions = [
  { value: "wealth_management", label: "Wealth Management", icon: TrendingUp, description: "Grow and protect your assets" },
  { value: "retirement_planning", label: "Retirement Planning", icon: PiggyBank, description: "Plan for your future" },
  { value: "tax_planning", label: "Tax Planning", icon: Building, description: "Optimize your tax strategy" },
  { value: "insurance", label: "Insurance Solutions", icon: ShieldCheck, description: "Protect what matters most" },
  { value: "estate_planning", label: "Estate Planning", icon: Briefcase, description: "Secure your legacy" },
  { value: "education_savings", label: "Education Savings", icon: GraduationCap, description: "Invest in education" },
  { value: "general_consultation", label: "General Consultation", icon: MessageSquare, description: "Let's have a conversation" },
];

const assetRanges = [
  { value: "under_100k", label: "Under $100,000" },
  { value: "100k_250k", label: "$100,000 - $250,000" },
  { value: "250k_500k", label: "$250,000 - $500,000" },
  { value: "500k_1m", label: "$500,000 - $1,000,000" },
  { value: "1m_5m", label: "$1,000,000 - $5,000,000" },
  { value: "over_5m", label: "Over $5,000,000" },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

const urgencyOptions = [
  { value: "immediate", label: "As soon as possible", icon: Sparkles },
  { value: "within_month", label: "Within the next month", icon: Calendar },
  { value: "exploring", label: "Just exploring options", icon: Clock },
];

const referralSources = [
  { value: "website", label: "Found your website" },
  { value: "referral", label: "Referred by someone" },
  { value: "social_media", label: "Social media" },
  { value: "event", label: "Event or seminar" },
  { value: "other", label: "Other" },
];

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: "email" | "phone" | "either";
  interestType: string;
  estimatedAssets: string;
  currentlyWorkingWithAdvisor: boolean;
  bestTimeToContact: string;
  urgency: string;
  goals: string;
  questions: string;
  referralSource: string;
  referredBy: string;
};

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  preferredContact: "email",
  interestType: "general_consultation",
  estimatedAssets: "",
  currentlyWorkingWithAdvisor: false,
  bestTimeToContact: "",
  urgency: "",
  goals: "",
  questions: "",
  referralSource: "website",
  referredBy: "",
};

export default function ProspectIntake() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/prospects/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit");
      }
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Thank you!",
        description: "We've received your information and will be in touch soon.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const isStep1Valid = formData.firstName && formData.lastName && formData.email;
  const isStep2Valid = formData.interestType;
  const isStep3Valid = true; // Optional fields

  const handleSubmit = () => {
    submitMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-lg w-full bg-white/95 backdrop-blur shadow-2xl">
            <CardContent className="pt-12 pb-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Check className="w-10 h-10 text-emerald-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Thank You!</h2>
              <p className="text-slate-600 mb-6">
                We've received your information and appreciate your interest. 
                A member of our team will reach out to you shortly to schedule 
                an initial conversation.
              </p>
              <p className="text-sm text-slate-500">
                In the meantime, feel free to explore our website or reach out 
                if you have any immediate questions.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-emerald-400" />
            <span className="text-xl font-bold text-white">PracticeOS</span>
          </div>
          <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            Schedule a Consultation
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      s < step
                        ? "bg-emerald-500 text-white"
                        : s === step
                        ? "bg-white text-slate-900"
                        : "bg-white/20 text-white/50"
                    }`}
                  >
                    {s < step ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`w-full h-1 mx-2 rounded ${
                        s < step ? "bg-emerald-500" : "bg-white/20"
                      }`}
                      style={{ width: "60px" }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-white/60">
              <span>Contact</span>
              <span>Interests</span>
              <span>Details</span>
              <span>Review</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Contact Information */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/95 backdrop-blur shadow-2xl">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <User className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle>Let's get to know you</CardTitle>
                        <CardDescription>Tell us a bit about yourself</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => updateField("firstName", e.target.value)}
                          placeholder="John"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => updateField("lastName", e.target.value)}
                          placeholder="Smith"
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="john@example.com"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="(555) 123-4567"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Preferred Contact Method</Label>
                      <RadioGroup
                        value={formData.preferredContact}
                        onValueChange={(v) => updateField("preferredContact", v as "email" | "phone" | "either")}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="email" id="contact-email" />
                          <Label htmlFor="contact-email" className="font-normal cursor-pointer">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="phone" id="contact-phone" />
                          <Label htmlFor="contact-phone" className="font-normal cursor-pointer">Phone</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="either" id="contact-either" />
                          <Label htmlFor="contact-either" className="font-normal cursor-pointer">Either</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button
                        onClick={nextStep}
                        disabled={!isStep1Valid}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Interests */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/95 backdrop-blur shadow-2xl">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Target className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle>What brings you here?</CardTitle>
                        <CardDescription>Select what you're most interested in</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3">
                      {interestOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.interestType === option.value
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="interestType"
                            value={option.value}
                            checked={formData.interestType === option.value}
                            onChange={(e) => updateField("interestType", e.target.value)}
                            className="sr-only"
                          />
                          <div className={`p-2.5 rounded-lg ${
                            formData.interestType === option.value
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            <option.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{option.label}</p>
                            <p className="text-sm text-slate-500">{option.description}</p>
                          </div>
                          {formData.interestType === option.value && (
                            <Check className="w-5 h-5 text-emerald-500" />
                          )}
                        </label>
                      ))}
                    </div>

                    <div className="pt-4 flex justify-between">
                      <Button variant="outline" onClick={prevStep}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={nextStep}
                        disabled={!isStep2Valid}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Additional Details */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/95 backdrop-blur shadow-2xl">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <HandCoins className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle>A few more details</CardTitle>
                        <CardDescription>Help us prepare for our conversation (all optional)</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label>Estimated Investable Assets</Label>
                      <Select
                        value={formData.estimatedAssets}
                        onValueChange={(v) => updateField("estimatedAssets", v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select a range (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetRanges.map((range) => (
                            <SelectItem key={range.value} value={range.value}>
                              {range.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>How soon would you like to connect?</Label>
                      <div className="grid gap-2">
                        {urgencyOptions.map((option) => (
                          <label
                            key={option.value}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              formData.urgency === option.value
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="urgency"
                              value={option.value}
                              checked={formData.urgency === option.value}
                              onChange={(e) => updateField("urgency", e.target.value)}
                              className="sr-only"
                            />
                            <option.icon className={`w-5 h-5 ${
                              formData.urgency === option.value ? "text-emerald-500" : "text-slate-400"
                            }`} />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
                      <Checkbox
                        id="hasAdvisor"
                        checked={formData.currentlyWorkingWithAdvisor}
                        onCheckedChange={(checked) => updateField("currentlyWorkingWithAdvisor", !!checked)}
                      />
                      <Label htmlFor="hasAdvisor" className="font-normal cursor-pointer">
                        I'm currently working with a financial advisor
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="goals">What are your main financial goals?</Label>
                      <Textarea
                        id="goals"
                        value={formData.goals}
                        onChange={(e) => updateField("goals", e.target.value)}
                        placeholder="Share what you'd like to achieve..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="questions">Any questions for us?</Label>
                      <Textarea
                        id="questions"
                        value={formData.questions}
                        onChange={(e) => updateField("questions", e.target.value)}
                        placeholder="Anything you'd like to know before we connect..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>How did you hear about us?</Label>
                      <Select
                        value={formData.referralSource}
                        onValueChange={(v) => updateField("referralSource", v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {referralSources.map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.referralSource === "referral" && (
                      <div className="space-y-2">
                        <Label htmlFor="referredBy">Who referred you?</Label>
                        <Input
                          id="referredBy"
                          value={formData.referredBy}
                          onChange={(e) => updateField("referredBy", e.target.value)}
                          placeholder="Name of the person who referred you"
                          className="h-11"
                        />
                      </div>
                    )}

                    <div className="pt-4 flex justify-between">
                      <Button variant="outline" onClick={prevStep}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={nextStep}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Review
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 4: Review & Submit */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/95 backdrop-blur shadow-2xl">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Check className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle>Review your information</CardTitle>
                        <CardDescription>Make sure everything looks correct</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="text-sm font-medium text-slate-500 mb-2">Contact Information</h4>
                        <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                        <p className="text-sm text-slate-600">{formData.email}</p>
                        {formData.phone && <p className="text-sm text-slate-600">{formData.phone}</p>}
                        <p className="text-sm text-slate-500 mt-1">
                          Preferred: {formData.preferredContact}
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="text-sm font-medium text-slate-500 mb-2">Interest</h4>
                        <p className="font-medium">
                          {interestOptions.find(o => o.value === formData.interestType)?.label}
                        </p>
                      </div>

                      {(formData.estimatedAssets || formData.urgency || formData.goals) && (
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <h4 className="text-sm font-medium text-slate-500 mb-2">Additional Details</h4>
                          {formData.estimatedAssets && (
                            <p className="text-sm text-slate-600">
                              Assets: {assetRanges.find(r => r.value === formData.estimatedAssets)?.label}
                            </p>
                          )}
                          {formData.urgency && (
                            <p className="text-sm text-slate-600">
                              Timeline: {urgencyOptions.find(u => u.value === formData.urgency)?.label}
                            </p>
                          )}
                          {formData.goals && (
                            <p className="text-sm text-slate-600 mt-2">
                              Goals: {formData.goals}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex justify-between">
                      <Button variant="outline" onClick={prevStep}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 min-w-[140px]"
                      >
                        {submitMutation.isPending ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Request
                            <Check className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t border-white/10 py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-white/50">
          <p>Your information is secure and will only be used to contact you about our services.</p>
        </div>
      </footer>
    </div>
  );
}




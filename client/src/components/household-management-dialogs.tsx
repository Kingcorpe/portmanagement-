import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  insertIndividualSchema,
  insertCorporationSchema,
  insertIndividualAccountSchema,
  insertCorporateAccountSchema,
  insertJointAccountSchema,
  type InsertIndividual,
  type InsertCorporation,
  type InsertIndividualAccount,
  type InsertCorporateAccount,
  type InsertJointAccount,
  type Individual,
  type Corporation,
} from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RiskCategorySelector } from "./risk-category-selector";

interface HouseholdManagementDialogsProps {
  householdId: string | null;
  individualId: string | null;
  individualDateOfBirth?: Date | null;
  corporationId: string | null;
  dialogType: "individual" | "corporation" | "individual-account" | "corporate-account" | "joint-account" | null;
  onClose: () => void;
}

export function HouseholdManagementDialogs({
  householdId,
  individualId,
  individualDateOfBirth,
  corporationId,
  dialogType,
  onClose,
}: HouseholdManagementDialogsProps) {
  const { toast } = useToast();

  // Optional account type selection when creating individual or corporation
  const [individualAccountType, setIndividualAccountType] = useState<string>("");
  const [corporateAccountType, setCorporateAccountType] = useState<string>("");
  
  // Risk percentage state for individual creation with account (5 categories)
  const [individualRiskLow, setIndividualRiskLow] = useState<number>(0);
  const [individualRiskLowMedium, setIndividualRiskLowMedium] = useState<number>(0);
  const [individualRiskMedium, setIndividualRiskMedium] = useState<number>(0);
  const [individualRiskMediumHigh, setIndividualRiskMediumHigh] = useState<number>(0);
  const [individualRiskHigh, setIndividualRiskHigh] = useState<number>(0);
  
  // Risk percentage state for corporation creation with account (5 categories)
  const [corporateRiskLow, setCorporateRiskLow] = useState<number>(0);
  const [corporateRiskLowMedium, setCorporateRiskLowMedium] = useState<number>(0);
  const [corporateRiskMedium, setCorporateRiskMedium] = useState<number>(0);
  const [corporateRiskMediumHigh, setCorporateRiskMediumHigh] = useState<number>(0);
  const [corporateRiskHigh, setCorporateRiskHigh] = useState<number>(0);

  // Reset account type selections and risk percentages when dialog closes
  useEffect(() => {
    if (dialogType !== "individual") {
      setIndividualAccountType("");
      setIndividualRiskLow(0);
      setIndividualRiskLowMedium(0);
      setIndividualRiskMedium(0);
      setIndividualRiskMediumHigh(0);
      setIndividualRiskHigh(0);
    }
    if (dialogType !== "corporation") {
      setCorporateAccountType("");
      setCorporateRiskLow(0);
      setCorporateRiskLowMedium(0);
      setCorporateRiskMedium(0);
      setCorporateRiskMediumHigh(0);
      setCorporateRiskHigh(0);
    }
  }, [dialogType]);

  // Individual form
  const individualForm = useForm<InsertIndividual>({
    resolver: zodResolver(insertIndividualSchema),
    defaultValues: {
      householdId: "",
      name: "",
      dateOfBirth: undefined,
    },
  });

  // Update form values when householdId changes and reset when dialog closes
  useEffect(() => {
    if (householdId && dialogType === "individual") {
      individualForm.setValue("householdId", householdId);
    } else if (dialogType !== "individual") {
      individualForm.reset();
    }
  }, [householdId, dialogType, individualForm]);

  // Corporation form
  const corporationForm = useForm<InsertCorporation>({
    resolver: zodResolver(insertCorporationSchema),
    defaultValues: {
      householdId: "",
      name: "",
    },
  });

  // Update form values when householdId changes and reset when dialog closes
  useEffect(() => {
    if (householdId && dialogType === "corporation") {
      corporationForm.setValue("householdId", householdId);
    } else if (dialogType !== "corporation") {
      corporationForm.reset();
    }
  }, [householdId, dialogType, corporationForm]);

  // Individual account form
  const individualAccountForm = useForm<InsertIndividualAccount>({
    resolver: zodResolver(insertIndividualAccountSchema),
    defaultValues: {
      individualId: "",
      type: "cash",
      nickname: undefined,
      balance: "0",
      riskLowPct: "0",
      riskLowMediumPct: "0",
      riskMediumPct: "0",
      riskMediumHighPct: "0",
      riskHighPct: "0",
    },
  });

  // Update form values when individualId changes and reset when dialog closes
  useEffect(() => {
    if (individualId && dialogType === "individual-account") {
      individualAccountForm.setValue("individualId", individualId);
    } else if (dialogType !== "individual-account") {
      individualAccountForm.reset();
    }
  }, [individualId, dialogType, individualAccountForm]);

  // Corporate account form
  const corporateAccountForm = useForm<InsertCorporateAccount>({
    resolver: zodResolver(insertCorporateAccountSchema),
    defaultValues: {
      corporationId: "",
      type: "cash",
      nickname: undefined,
      balance: "0",
      riskLowPct: "0",
      riskLowMediumPct: "0",
      riskMediumPct: "0",
      riskMediumHighPct: "0",
      riskHighPct: "0",
    },
  });

  // Update form values when corporationId changes and reset when dialog closes
  useEffect(() => {
    if (corporationId && dialogType === "corporate-account") {
      corporateAccountForm.setValue("corporationId", corporationId);
    } else if (dialogType !== "corporate-account") {
      corporateAccountForm.reset();
    }
  }, [corporationId, dialogType, corporateAccountForm]);

  // Joint account form
  const jointAccountForm = useForm<InsertJointAccount>({
    resolver: zodResolver(insertJointAccountSchema),
    defaultValues: {
      householdId: "",
      type: "joint_cash",
      nickname: undefined,
      balance: "0",
      riskLowPct: "0",
      riskLowMediumPct: "0",
      riskMediumPct: "0",
      riskMediumHighPct: "0",
      riskHighPct: "0",
    },
  });

  // Update form values when householdId changes and reset when dialog closes
  useEffect(() => {
    if (householdId && dialogType === "joint-account") {
      jointAccountForm.setValue("householdId", householdId);
    } else if (dialogType !== "joint-account") {
      jointAccountForm.reset();
    }
  }, [householdId, dialogType, jointAccountForm]);

  // Mutations
  const createIndividualMutation = useMutation({
    mutationFn: async (data: InsertIndividual) => {
      const response = await apiRequest("POST", "/api/individuals", data);
      const individual = await response.json() as Individual;
      
      // Create the account with risk percentages (5 categories)
      await apiRequest("POST", "/api/individual-accounts", {
        individualId: individual.id,
        type: individualAccountType,
        riskLowPct: individualRiskLow,
        riskLowMediumPct: individualRiskLowMedium,
        riskMediumPct: individualRiskMedium,
        riskMediumHighPct: individualRiskMediumHigh,
        riskHighPct: individualRiskHigh,
      });
      
      return individual;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Individual and account created successfully" });
      onClose();
      individualForm.reset();
      setIndividualAccountType("");
      setIndividualRiskLow(0);
      setIndividualRiskLowMedium(0);
      setIndividualRiskMedium(0);
      setIndividualRiskMediumHigh(0);
      setIndividualRiskHigh(0);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create individual", variant: "destructive" });
    },
  });

  const createCorporationMutation = useMutation({
    mutationFn: async (data: InsertCorporation) => {
      const response = await apiRequest("POST", "/api/corporations", data);
      const corporation = await response.json() as Corporation;
      
      // Create the account with risk percentages
      await apiRequest("POST", "/api/corporate-accounts", {
        corporationId: corporation.id,
        type: corporateAccountType,
        riskMediumPct: corporateRiskMedium,
        riskMediumHighPct: corporateRiskMediumHigh,
        riskHighPct: corporateRiskHigh,
      });
      
      return corporation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Corporation and account created successfully" });
      onClose();
      corporationForm.reset();
      setCorporateAccountType("");
      setCorporateRiskMedium(0);
      setCorporateRiskMediumHigh(0);
      setCorporateRiskHigh(0);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create corporation", variant: "destructive" });
    },
  });

  const createIndividualAccountMutation = useMutation({
    mutationFn: async (data: InsertIndividualAccount) => await apiRequest("POST", "/api/individual-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Account created successfully" });
      onClose();
      individualAccountForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create account", variant: "destructive" });
    },
  });

  const createCorporateAccountMutation = useMutation({
    mutationFn: async (data: InsertCorporateAccount) => await apiRequest("POST", "/api/corporate-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Account created successfully" });
      onClose();
      corporateAccountForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create account", variant: "destructive" });
    },
  });

  const createJointAccountMutation = useMutation({
    mutationFn: async (data: InsertJointAccount) => await apiRequest("POST", "/api/joint-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Joint account created successfully" });
      onClose();
      jointAccountForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create joint account", variant: "destructive" });
    },
  });

  return (
    <>
      {/* Individual Dialog */}
      <Dialog open={dialogType === "individual"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Individual</DialogTitle>
            <DialogDescription>Add a new individual and account to this household.</DialogDescription>
          </DialogHeader>
          <Form {...individualForm}>
            <form onSubmit={individualForm.handleSubmit((data) => createIndividualMutation.mutate(data))} className="space-y-4">
              <FormField
                control={individualForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John Smith" 
                        data-testid="input-individual-name" 
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            onClose();
                          }
                        }}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Type</label>
                <Select value={individualAccountType} onValueChange={setIndividualAccountType}>
                  <SelectTrigger data-testid="select-individual-account-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="fhsa">FHSA</SelectItem>
                    <SelectItem value="liff">LIF</SelectItem>
                    <SelectItem value="lira">LIRA</SelectItem>
                    <SelectItem value="rif">RIF</SelectItem>
                    <SelectItem value="rrsp">RRSP</SelectItem>
                    <SelectItem value="tfsa">TFSA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <RiskCategorySelector
                medium={individualRiskMedium}
                mediumHigh={individualRiskMediumHigh}
                high={individualRiskHigh}
                onMediumChange={setIndividualRiskMedium}
                onMediumHighChange={setIndividualRiskMediumHigh}
                onHighChange={setIndividualRiskHigh}
                testIdPrefix="input-ind-risk"
              />

              {individualAccountType === "rif" && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <FormField
                    control={individualForm.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            data-testid="input-individual-dob" 
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={individualForm.control}
                    name="spouseDateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spouse Date of Birth <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            data-testid="input-spouse-dob" 
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">If spouse is younger, their age can be used for RIF minimum withdrawals</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createIndividualMutation.isPending || 
                    !individualAccountType || 
                    individualAccountType === "none" ||
                    (individualRiskMedium + individualRiskMediumHigh + individualRiskHigh) !== 100 ||
                    (individualAccountType === "rif" && !individualForm.watch("dateOfBirth"))
                  }
                >
                  {createIndividualMutation.isPending ? "Creating..." : "Create Individual & Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Corporation Dialog */}
      <Dialog open={dialogType === "corporation"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Corporation</DialogTitle>
            <DialogDescription>Add a new corporation and account to this household.</DialogDescription>
          </DialogHeader>
          <Form {...corporationForm}>
            <form onSubmit={corporationForm.handleSubmit((data) => createCorporationMutation.mutate(data))} className="space-y-4">
              <FormField
                control={corporationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith Corp" data-testid="input-corporation-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Type</label>
                <Select value={corporateAccountType} onValueChange={setCorporateAccountType}>
                  <SelectTrigger data-testid="select-corporate-account-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="ipp">IPP (Individual Pension Plan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <RiskCategorySelector
                medium={corporateRiskMedium}
                mediumHigh={corporateRiskMediumHigh}
                high={corporateRiskHigh}
                onMediumChange={setCorporateRiskMedium}
                onMediumHighChange={setCorporateRiskMediumHigh}
                onHighChange={setCorporateRiskHigh}
                testIdPrefix="input-corp-risk"
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createCorporationMutation.isPending || 
                    !corporateAccountType || 
                    corporateAccountType === "none" ||
                    (corporateRiskMedium + corporateRiskMediumHigh + corporateRiskHigh) !== 100
                  }
                >
                  {createCorporationMutation.isPending ? "Creating..." : "Create Corporation & Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Individual Account Dialog */}
      <Dialog open={dialogType === "individual-account"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>Add a new account for this individual.</DialogDescription>
          </DialogHeader>
          <Form {...individualAccountForm}>
            <form onSubmit={individualAccountForm.handleSubmit((data) => createIndividualAccountMutation.mutate(data))} className="space-y-4">
              <FormField
                control={individualAccountForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account-type">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="tfsa">TFSA</SelectItem>
                        <SelectItem value="fhsa">FHSA</SelectItem>
                        <SelectItem value="rrsp">RRSP</SelectItem>
                        <SelectItem value="lira">LIRA</SelectItem>
                        <SelectItem value="liff">LIF</SelectItem>
                        <SelectItem value="rif">RIF</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={individualAccountForm.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Vanguard Personal" 
                        data-testid="input-account-nickname" 
                        {...field} 
                        value={field.value ?? ""} 
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* RIF requires Date of Birth warning */}
              {individualAccountForm.watch("type") === "rif" && !individualDateOfBirth && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    Date of Birth Required for RIF
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    This individual must have a date of birth set before creating a RIF account. 
                    Please edit the individual's profile first.
                  </p>
                </div>
              )}

              <RiskCategorySelector
                medium={Number(individualAccountForm.watch("riskMediumPct") || 0)}
                mediumHigh={Number(individualAccountForm.watch("riskMediumHighPct") || 0)}
                high={Number(individualAccountForm.watch("riskHighPct") || 0)}
                onMediumChange={(v) => individualAccountForm.setValue("riskMediumPct", String(v))}
                onMediumHighChange={(v) => individualAccountForm.setValue("riskMediumHighPct", String(v))}
                onHighChange={(v) => individualAccountForm.setValue("riskHighPct", String(v))}
                testIdPrefix="input-ind-acct-risk"
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createIndividualAccountMutation.isPending ||
                    (Number(individualAccountForm.watch("riskMediumPct") || 0) + 
                     Number(individualAccountForm.watch("riskMediumHighPct") || 0) + 
                     Number(individualAccountForm.watch("riskHighPct") || 0)) !== 100 ||
                    (individualAccountForm.watch("type") === "rif" && !individualDateOfBirth)
                  }
                >
                  {createIndividualAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Corporate Account Dialog */}
      <Dialog open={dialogType === "corporate-account"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>Add a new account for this corporation.</DialogDescription>
          </DialogHeader>
          <Form {...corporateAccountForm}>
            <form onSubmit={corporateAccountForm.handleSubmit((data) => createCorporateAccountMutation.mutate(data))} className="space-y-4">
              <FormField
                control={corporateAccountForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account-type">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="ipp">IPP (Individual Pension Plan)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={corporateAccountForm.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Corporate Cash" 
                        data-testid="input-account-nickname" 
                        {...field} 
                        value={field.value ?? ""} 
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <RiskCategorySelector
                medium={Number(corporateAccountForm.watch("riskMediumPct") || 0)}
                mediumHigh={Number(corporateAccountForm.watch("riskMediumHighPct") || 0)}
                high={Number(corporateAccountForm.watch("riskHighPct") || 0)}
                onMediumChange={(v) => corporateAccountForm.setValue("riskMediumPct", String(v))}
                onMediumHighChange={(v) => corporateAccountForm.setValue("riskMediumHighPct", String(v))}
                onHighChange={(v) => corporateAccountForm.setValue("riskHighPct", String(v))}
                testIdPrefix="input-corp-acct-risk"
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createCorporateAccountMutation.isPending ||
                    (Number(corporateAccountForm.watch("riskMediumPct") || 0) + 
                     Number(corporateAccountForm.watch("riskMediumHighPct") || 0) + 
                     Number(corporateAccountForm.watch("riskHighPct") || 0)) !== 100
                  }
                >
                  {createCorporateAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Joint Account Dialog */}
      <Dialog open={dialogType === "joint-account"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Joint Account</DialogTitle>
            <DialogDescription>Add a new joint account to this household.</DialogDescription>
          </DialogHeader>
          <Form {...jointAccountForm}>
            <form onSubmit={jointAccountForm.handleSubmit((data) => createJointAccountMutation.mutate(data))} className="space-y-4">
              <FormField
                control={jointAccountForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-joint-account-type">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="joint_cash">Joint Cash</SelectItem>
                        <SelectItem value="resp">RESP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={jointAccountForm.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Kids Education Fund" 
                        data-testid="input-account-nickname" 
                        {...field} 
                        value={field.value ?? ""} 
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <RiskCategorySelector
                medium={Number(jointAccountForm.watch("riskMediumPct") || 0)}
                mediumHigh={Number(jointAccountForm.watch("riskMediumHighPct") || 0)}
                high={Number(jointAccountForm.watch("riskHighPct") || 0)}
                onMediumChange={(v) => jointAccountForm.setValue("riskMediumPct", String(v))}
                onMediumHighChange={(v) => jointAccountForm.setValue("riskMediumHighPct", String(v))}
                onHighChange={(v) => jointAccountForm.setValue("riskHighPct", String(v))}
                testIdPrefix="input-joint-acct-risk"
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createJointAccountMutation.isPending ||
                    (Number(jointAccountForm.watch("riskMediumPct") || 0) + 
                     Number(jointAccountForm.watch("riskMediumHighPct") || 0) + 
                     Number(jointAccountForm.watch("riskHighPct") || 0)) !== 100
                  }
                >
                  {createJointAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
